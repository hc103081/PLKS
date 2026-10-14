// apps/api/src/routes/sidekick-stream.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { container } from "tsyringe";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { GamificationServiceInterface } from "../modules/gamification/gamification.service.js";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { QuizItemPayload } from "@plks/shared/schemas";

const SidekickStreamQuerySchema = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(1),
});

interface SidekickStreamQuery {
  sessionId: string;
  question: string;
}

export async function sidekickStreamRoutes(fastify: FastifyInstance): Promise<void> {
  const aiGateway = container.resolve<IAIReasoningGateway>("IAIReasoningGateway");
  const storage = container.resolve<IStorageAdapter>("IStorageAdapter");
  const gamification = container.resolve<GamificationServiceInterface>("GamificationService");

  fastify.get<{ Querystring: SidekickStreamQuery }>(
    "/gamification/sidekick/stream",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["sessionId", "question"],
          properties: {
            sessionId: { type: "string", format: "uuid" },
            question: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { sessionId, question } = request.query;

      // Get game session from gamification service
      const sessionResult = await gamification.getGameState(sessionId);
      if (sessionResult.isErr()) {
        return reply.code(404).send({ error: "Game session not found" });
      }

      const session = sessionResult.value;

      // Get current quiz (the one that was answered incorrectly)
      const currentQuizIndex = session.currentIndex - 1; // Previous quiz
      if (currentQuizIndex < 0 || currentQuizIndex >= session.quizItems.length) {
        return reply.code(400).send({ error: "No current quiz to get help for" });
      }

      const currentQuiz = session.quizItems[currentQuizIndex] as QuizItemPayload;

      // Load concept nodes from B2 for this course
      const conceptNodes = await loadConceptNodes(storage, session.courseId);
      const relatedConcept = conceptNodes.get(currentQuiz.contextReference);

      // Get slide URI and generate presigned URL
      let slideUris: string[] = [];
      if (relatedConcept?.sourceEvidence?.slideUri) {
        const presignedResult = await storage.generatePresignedUrl(relatedConcept.sourceEvidence.slideUri, 300); // 5 minutes
        if (presignedResult.isOk()) {
          slideUris = [presignedResult.value];
        }
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      const sendEvent = (data: object): void => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        // Build system prompt for Sidekick chat
        const systemPrompt = buildSidekickSystemPrompt(currentQuiz, relatedConcept);

        // Call AI Gateway streaming
        for await (const chunk of aiGateway.multimodalInferStream(systemPrompt, question, slideUris)) {
          if (chunk.content) {
            sendEvent({ type: "delta", content: chunk.content });
          }
        }

        sendEvent({ type: "done" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error({ err: error }, "Sidekick stream error");
        sendEvent({ type: "error", error: errorMessage });
      } finally {
        reply.raw.end();
      }
    },
  );
}

async function loadConceptNodes(
  storage: IStorageAdapter,
  courseId: string,
): Promise<Map<string, ConceptNodePayload>> {
  const map = new Map<string, ConceptNodePayload>();
  const prefix = `vault/${courseId}/`;
  const listResult = await storage.listDirectory(prefix);
  if (listResult.isErr()) {
    return map;
  }
  const mdUris = listResult.value.filter((u) => u.endsWith(".md"));

  for (const uri of mdUris) {
    const dl = await storage.downloadFile(uri);
    if (dl.isErr()) continue;
    const chunks: string[] = [];
    for await (const chunk of dl.value) {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
    }
    const md = chunks.join("");
    const parsed = parseMarkdownConcept(md, courseId);
    if (parsed) map.set(parsed.conceptId, parsed);
  }
  return map;
}

function parseMarkdownConcept(md: string, courseId: string): ConceptNodePayload | null {
  try {
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) return null;
    const fmBlock: string = fmMatch[1] ?? "";
    const getYaml = (k: string): string | undefined => {
      const m = fmBlock.match(new RegExp(`^${k}:\\s*"?([^"\n]+)"?`, "m"));
      return m ? m[1] : undefined;
    };
    const conceptId = getYaml("conceptId");
    const term = getYaml("term");
    const transcriptRef = fmBlock.match(/transcriptRef:\s*"?([^"\n]+)"?/m)?.[1] ?? "";
    const slideUri = fmBlock.match(/slideUri:\s*"?([^"\n]+)"?/m)?.[1] ?? "";
    if (!conceptId || !term) return null;

    const body = md.slice(fmMatch[0].length);
    const heading = body.match(/^#\s+(.+)$/m)?.[1] ?? term;
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

function buildSidekickSystemPrompt(
  currentQuiz: QuizItemPayload,
  relatedConcept: ConceptNodePayload | undefined,
): string {
  return `你是 PLKS 學習夥伴 Sidekick。請根據以下上下文協助學生：

當前題目：${currentQuiz.question}
題目類型：${currentQuiz.type}
正確答案：${currentQuiz.correctAnswer}
相關概念：${relatedConcept?.term || "無"}
概念解釋：${relatedConcept?.explanation || "無"}

請用繁體中文回應，語氣鼓勵、具體、可執行。`;
}