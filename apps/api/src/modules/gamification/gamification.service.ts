// apps/api/src/modules/gamification/gamification.service.ts
import { randomUUID } from "node:crypto";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { QuizItemPayload } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { DomainError } from "../../core/errors/domain-errors.js";
import { SidekickStateMachine } from "./sidekick-state-machine.js";
import type { GameSession, GamificationConfig, QuizAnswer, SidekickResponse } from "./types.js";

export interface GamificationServiceInterface {
  startGame(
    courseId: string,
  ): Promise<Result<{ sessionId: string; quiz: QuizItemPayload }, DomainError>>;
  submitAnswer(
    sessionId: string,
    userAnswer: string,
    timeSpentMs: number,
  ): Promise<
    Result<
      { session: GameSession; isCorrect: boolean; xpEarned: number; nextQuiz?: QuizItemPayload },
      DomainError
    >
  >;
  requestHelp(sessionId: string): Promise<Result<SidekickResponse, DomainError>>;
  getGameState(sessionId: string): Promise<Result<GameSession, DomainError>>;
}

export function createGamificationService(
  storage: IStorageAdapter,
  aiGateway: IAIReasoningGateway,
  graphWriter: IKnowledgeGraphWriter,
  config: GamificationConfig = {
    maxStreakBonus: 5,
    baseXpPerCorrect: 100,
    streakXpMultiplier: 1.5,
  },
): GamificationServiceInterface {
  const stateMachine = new SidekickStateMachine(storage, aiGateway, graphWriter, config);

  const startGame = async (
    courseId: string,
  ): Promise<Result<{ sessionId: string; quiz: QuizItemPayload }, DomainError>> => {
    try {
      // Load quiz items from B2 _quiz/{courseId}.json
      const quizItems = await loadQuizItems(storage, courseId);
      if (quizItems.isErr()) {
        return err(quizItems.error);
      }

      if (quizItems.value.length === 0) {
        return err(DomainError.notFound("QuizItems", courseId));
      }

      const sessionId = randomUUID();
      const initResult = await stateMachine.initialize(sessionId, courseId, quizItems.value);
      if (initResult.isErr()) {
        return err(initResult.error);
      }

      const firstQuiz = quizItems.value[0];
      // firstQuiz is guaranteed to exist because we checked length > 0
      return ok({ sessionId, quiz: firstQuiz as QuizItemPayload });
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  };

  type SubmitAnswerResult = {
    session: GameSession;
    isCorrect: boolean;
    xpEarned: number;
    nextQuiz?: QuizItemPayload;
  };

  const submitAnswer = async (
    sessionId: string,
    userAnswer: string,
    timeSpentMs: number,
  ): Promise<Result<SubmitAnswerResult, DomainError>> => {
    const result = await stateMachine.submitAnswer(sessionId, userAnswer, timeSpentMs);
    if (result.isErr()) {
      return err(result.error);
    }

    const { session, isCorrect, xpEarned } = result.value;

    if (session.state === "PLAYING" && session.currentIndex < session.quizItems.length) {
      const nextQuiz = session.quizItems[session.currentIndex] as QuizItemPayload;
      return ok({ session, isCorrect, xpEarned, nextQuiz });
    }

    return ok({ session, isCorrect, xpEarned });
  };

  const requestHelp = async (sessionId: string): Promise<Result<SidekickResponse, DomainError>> => {
    return stateMachine.requestSidekickHelp(sessionId);
  };

  const getGameState = async (sessionId: string): Promise<Result<GameSession, DomainError>> => {
    const session = stateMachine.getSession(sessionId);
    if (!session) {
      return err(DomainError.notFound("GameSession", sessionId));
    }
    return ok(session);
  };

  return {
    startGame,
    submitAnswer,
    requestHelp,
    getGameState,
  };
}

async function loadQuizItems(
  storage: IStorageAdapter,
  courseId: string,
): Promise<Result<QuizItemPayload[], DomainError>> {
  try {
    const path = `vault/${courseId}/_quiz/${courseId}.json`;
    const result = await storage.downloadFile(path);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return err(DomainError.notFound("QuizItems", courseId));
      }
      return err(result.error);
    }

    const stream = result.value;
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
    }
    const content = chunks.join("");

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return ok(parsed as QuizItemPayload[]);
    }
    if (parsed && Array.isArray((parsed as { items?: QuizItemPayload[] }).items)) {
      return ok((parsed as { items: QuizItemPayload[] }).items);
    }
    return err(
      DomainError.aiValidationFailed(new Error(`Quiz JSON format unexpected: ${typeof parsed}`)),
    );
  } catch (cause) {
    return err(DomainError.ingestionFailed(cause));
  }
}
