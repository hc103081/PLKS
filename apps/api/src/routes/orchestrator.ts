// apps/api/src/routes/orchestrator.ts
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import { z } from "zod";
import type { OrchestratorService } from "../modules/orchestrator/orchestrator.service.js";

const StartSessionBodySchema = z.object({
  sessionId: z.string().uuid(),
  courseId: z.string().min(1),
});

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

type StartSessionBody = z.infer<typeof StartSessionBodySchema>;
type SessionParams = z.infer<typeof SessionParamsSchema>;

function createStartSessionHandler(orchestrator: OrchestratorService): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = StartSessionBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid request body" });
    }

    const { sessionId, courseId } = parseResult.data;
    const result = await orchestrator.startSession(sessionId, courseId);

    if (result.isErr()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send(result.value);
  };
}

function createGetSessionStatusHandler(orchestrator: OrchestratorService): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = SessionParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid sessionId" });
    }

    const { sessionId } = parseResult.data;
    const result = await orchestrator.getSessionStatus(sessionId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send(result.value);
  };
}

function createRetrySessionHandler(orchestrator: OrchestratorService): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = SessionParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid sessionId" });
    }

    const { sessionId } = parseResult.data;
    const result = await orchestrator.retrySession(sessionId);

    if (result.isErr()) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send(result.value);
  };
}

export function registerOrchestratorRoutes(
  app: FastifyInstance,
  orchestrator: OrchestratorService,
  prefix = "/api",
): void {
  const startSessionHandler = createStartSessionHandler(orchestrator);
  const getSessionStatusHandler = createGetSessionStatusHandler(orchestrator);
  const retrySessionHandler = createRetrySessionHandler(orchestrator);

  app.post(`${prefix}/orchestrator/start`, startSessionHandler);
  app.get(`${prefix}/orchestrator/status/:sessionId`, getSessionStatusHandler);
  app.post(`${prefix}/orchestrator/retry/:sessionId`, retrySessionHandler);
}

// Export handlers for testing
export const startSessionHandler = createStartSessionHandler;
export const getSessionStatusHandler = createGetSessionStatusHandler;
export const retrySessionHandler = createRetrySessionHandler;
