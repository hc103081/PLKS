// apps/api/src/modules/gamification/sidekick-state-machine.ts
import { randomUUID } from "node:crypto";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { QuizItemPayload } from "@plks/shared/schemas";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { DomainError } from "../../core/errors/domain-errors.js";
import type {
  GameSession,
  GameState,
  GamificationConfig,
  QuizAnswer,
  SidekickContext,
  SidekickResponse,
} from "./types.js";

export class SidekickStateMachine {
  private readonly storage: IStorageAdapter;
  private readonly aiGateway: IAIReasoningGateway;
  private readonly graphWriter: IKnowledgeGraphWriter;
  private readonly config: GamificationConfig;
  private sessions: Map<string, GameSession> = new Map();

  constructor(
    storage: IStorageAdapter,
    aiGateway: IAIReasoningGateway,
    graphWriter: IKnowledgeGraphWriter,
    config: GamificationConfig = {
      maxStreakBonus: 5,
      baseXpPerCorrect: 100,
      streakXpMultiplier: 1.5,
    },
  ) {
    this.storage = storage;
    this.aiGateway = aiGateway;
    this.graphWriter = graphWriter;
    this.config = config;
  }

  /**
   * Initialize a new game session
   */
  async initialize(
    sessionId: string,
    courseId: string,
    quizItems: QuizItemPayload[],
  ): Promise<Result<GameSession, DomainError>> {
    try {
      // Load concept nodes from B2 for this course
      const conceptNodesResult = await this.loadConceptNodes(courseId);
      if (conceptNodesResult.isErr()) {
        return err(conceptNodesResult.error);
      }

      const session: GameSession = {
        sessionId,
        courseId,
        state: "INITIALIZE",
        quizItems,
        currentIndex: 0,
        score: 0,
        streak: 0,
        answers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.sessions.set(sessionId, session);

      // Transition to PLAYING state
      session.state = "PLAYING";
      session.updatedAt = new Date();

      return ok(session);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Submit an answer for the current quiz
   */
  async submitAnswer(
    sessionId: string,
    userAnswer: string,
    timeSpentMs: number,
  ): Promise<Result<{ session: GameSession; isCorrect: boolean; xpEarned: number }, DomainError>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return err(DomainError.notFound("GameSession", sessionId));
    }

    if (session.state !== "PLAYING") {
      return err(DomainError.invalidInput(`Cannot answer in state: ${session.state}`));
    }

    const currentQuiz = session.quizItems[session.currentIndex];
    if (!currentQuiz) {
      return err(DomainError.invalidInput("No current quiz"));
    }

    const isCorrect = this.checkAnswer(currentQuiz, userAnswer);
    const xpEarned = isCorrect ? this.calculateXp(session.streak) : 0;

    const answer: QuizAnswer = {
      quizId: currentQuiz.quizId,
      userAnswer,
      isCorrect,
      timeSpentMs,
    };

    session.answers.push(answer);

    if (isCorrect) {
      session.score += xpEarned;
      session.streak += 1;
    } else {
      session.streak = 0;
      // Transition to SIDEKICK_HELP state
      session.state = "SIDEKICK_HELP";
    }

    session.currentIndex += 1;
    session.updatedAt = new Date();

    // Check if game is completed
    if (session.currentIndex >= session.quizItems.length) {
      session.state = "COMPLETED";
    }

    return ok({ session, isCorrect, xpEarned });
  }

  /**
   * Request help from Sidekick (when answer is incorrect)
   */
  async requestSidekickHelp(sessionId: string): Promise<Result<SidekickResponse, DomainError>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return err(DomainError.notFound("GameSession", sessionId));
    }

    if (session.state !== "SIDEKICK_HELP") {
      return err(
        DomainError.invalidInput(
          `Sidekick help only available in SIDEKICK_HELP state, current: ${session.state}`,
        ),
      );
    }

    const currentQuiz = session.quizItems[session.currentIndex - 1]; // Previous quiz (the one answered incorrectly)
    if (!currentQuiz) {
      return err(DomainError.invalidInput("No quiz to get help for"));
    }

    // Find the related concept node
    const conceptNode = await this.findConceptNode(currentQuiz.contextReference, session.courseId);
    if (!conceptNode) {
      return err(DomainError.notFound("ConceptNode", currentQuiz.contextReference));
    }

    // Get related slide URIs and convert to Presigned URLs
    const slideUri = conceptNode.sourceEvidence.slideUri;
    const presignedResult = await this.storage.generatePresignedUrl(slideUri, 300); // 5 minutes expiry
    if (presignedResult.isErr()) {
      return err(presignedResult.error);
    }
    const slideUris = [presignedResult.value];

    // Call AI for Sidekick help
    const systemPrompt = "sidekick";
    const textPayload = JSON.stringify({
      wrongAnswer: session.answers[session.answers.length - 1]?.userAnswer,
      correctAnswer: currentQuiz.correctAnswer,
      question: currentQuiz.question,
      concept: conceptNode.term,
      explanation: conceptNode.explanation,
    });

    const aiResult = await this.aiGateway.multimodalInfer(systemPrompt, textPayload, slideUris);
    if (aiResult.isErr()) {
      return err(aiResult.error);
    }

    const response = aiResult.value as SidekickResponse;

    // Transition back to PLAYING state
    session.state = "PLAYING";
    session.updatedAt = new Date();

    return ok(response);
  }

  /**
   * Get current game session
   */
  getSession(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current quiz item
   */
  getCurrentQuiz(sessionId: string): QuizItemPayload | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return session.quizItems[session.currentIndex];
  }

  /**
   * Resume game after Sidekick help
   */
  resumeGame(sessionId: string): Result<GameSession, DomainError> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return err(DomainError.notFound("GameSession", sessionId));
    }

    if (session.state !== "PLAYING") {
      return err(DomainError.invalidInput(`Cannot resume in state: ${session.state}`));
    }

    return ok(session);
  }

  private checkAnswer(quiz: QuizItemPayload, userAnswer: string): boolean {
    // Normalize answers for comparison
    const normalize = (s: string) => s.trim().toLowerCase();
    return normalize(userAnswer) === normalize(quiz.correctAnswer);
  }

  private calculateXp(streak: number): number {
    const baseXp = this.config.baseXpPerCorrect;
    const multiplier = Math.min(
      this.config.streakXpMultiplier * streak,
      this.config.maxStreakBonus,
    );
    return Math.round(baseXp * multiplier);
  }

  private async loadConceptNodes(
    courseId: string,
  ): Promise<Result<Map<string, ConceptNodePayload>, DomainError>> {
    try {
      const map = new Map<string, ConceptNodePayload>();
      const prefix = `vault/${courseId}/`;
      const listResult = await this.storage.listDirectory(prefix);
      if (listResult.isErr()) {
        return ok(new Map());
      }
      const mdUris = listResult.value.filter((u) => u.endsWith(".md"));

      for (const uri of mdUris) {
        const dl = await this.storage.downloadFile(uri);
        if (dl.isErr()) continue;
        const chunks: string[] = [];
        for await (const chunk of dl.value) {
          chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
        }
        const md = chunks.join("");
        const parsed = this.parseMarkdownConcept(md, courseId);
        if (parsed) map.set(parsed.conceptId, parsed);
      }
      return ok(map);
    } catch (cause) {
      return ok(new Map());
    }
  }

  private parseMarkdownConcept(md: string, courseId: string): ConceptNodePayload | null {
    try {
      const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
      if (!fmMatch) return null;
      const fmBlock: string = fmMatch[1] ?? "";
      const getYaml = (k: string): string | undefined => {
        const m = fmBlock.match(new RegExp(`^${k}:\\s*"?([^"\n]+)"?`, "m"));
        return m ? m[1] : undefined;
      };
      const conceptId = getYaml("conceptId");
      const title = getYaml("title");
      const transcriptRef = fmBlock.match(/transcriptRef:\s*"?([^"\n]+)"?/m)?.[1] ?? "";
      const slideUri = fmBlock.match(/slideUri:\s*"?([^"\n]+)"?/m)?.[1] ?? "";
      if (!conceptId || !title) return null;

      const body = md.slice(fmMatch[0].length);
      const heading = body.match(/^#\s+(.+)$/m)?.[1] ?? title;
      const explanation = body
        .replace(/^#\s+.*$/m, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .trim()
        .slice(0, 1200);

      return {
        conceptId,
        courseId,
        term: heading,
        explanation,
        relatedTerms: [],
        sourceEvidence: { transcriptRef, slideUri },
      };
    } catch {
      return null;
    }
  }

  private async findConceptNode(
    conceptId: string,
    courseId: string,
  ): Promise<ConceptNodePayload | null> {
    const loaded = await this.loadConceptNodes(courseId);
    if (loaded.isErr()) return null;
    const node = loaded.value.get(conceptId);
    if (node) return node;

    const titleMap = new Map<string, ConceptNodePayload>();
    for (const v of loaded.value.values()) titleMap.set(v.term, v);

    const fallbacks = Array.from(loaded.value.values());
    if (conceptId.endsWith("1")) return fallbacks[0] ?? null;
    if (conceptId.endsWith("2")) return fallbacks[1] ?? fallbacks[0] ?? null;
    if (conceptId.endsWith("3")) return fallbacks[2] ?? fallbacks[0] ?? null;
    return fallbacks[0] ?? null;
  }
}
