// apps/api/src/routes/gamification.ts
import type { FastifyInstance, RouteHandlerMethod } from "fastify";
import { z } from "zod";
import type { GamificationServiceInterface } from "../modules/gamification/gamification.service.js";

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

const CourseParamsSchema = z.object({
  courseId: z.string().min(1),
});

const AnswerBodySchema = z.object({
  sessionId: z.string().uuid(),
  userAnswer: z.string(),
  timeSpentMs: z.number().int().positive(),
});

export function createStartGameHandler(
  gamification: GamificationServiceInterface,
): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = CourseParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid courseId" });
    }

    const { courseId } = parseResult.data;
    const result = await gamification.startGame(courseId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send(result.value);
  };
}

export function createSubmitAnswerHandler(
  gamification: GamificationServiceInterface,
): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = AnswerBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid request body" });
    }

    const { sessionId, userAnswer, timeSpentMs } = parseResult.data;
    const result = await gamification.submitAnswer(sessionId, userAnswer, timeSpentMs);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send(result.value);
  };
}

export function createRequestHelpHandler(
  gamification: GamificationServiceInterface,
): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = SessionParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid sessionId" });
    }

    const { sessionId } = parseResult.data;
    const result = await gamification.requestHelp(sessionId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send(result.value);
  };
}

export function createGetGameStateHandler(
  gamification: GamificationServiceInterface,
): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = SessionParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid sessionId" });
    }

    const { sessionId } = parseResult.data;
    const result = await gamification.getGameState(sessionId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(200).send(result.value);
  };
}

export function createGetGameSessionStateHandler(
  gamification: GamificationServiceInterface,
): RouteHandlerMethod {
  return async (request, reply) => {
    const parseResult = SessionParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid sessionId" });
    }

    const { sessionId } = parseResult.data;
    const result = await gamification.getGameState(sessionId);

    if (result.isErr()) {
      if (result.error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: result.error.message });
      }
      return reply.status(400).send({ error: result.error.message });
    }

    // Map backend GameSession to frontend GameSessionState
    const session = result.value;
    const sessionState = {
      sessionId: session.sessionId,
      courseId: session.courseId,
      currentQuizIndex: session.currentIndex,
      totalQuizzes: session.quizItems.length,
      score: session.score,
      streak: session.streak,
      maxStreak: session.streak, // Could track max separately
      xp: session.score,
      level: Math.floor(session.score / 1000) + 1,
      answers: session.answers.map((a) => ({
        quizId: a.quizId,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        timeSpentMs: a.timeSpentMs,
        xpEarned: a.isCorrect ? 100 : 0, // Simplified
        sidekickUsed: false,
      })),
      sidekickOpen: false,
      sidekickHistory: [],
      startedAt: session.createdAt,
      completedAt: session.state === "COMPLETED" ? session.updatedAt : undefined,
    };

    return reply.status(200).send(sessionState);
  };
}

export function registerGamificationRoutes(
  app: FastifyInstance,
  gamification: GamificationServiceInterface,
  prefix = "/api",
): void {
  const startGameHandler = createStartGameHandler(gamification);
  const submitAnswerHandler = createSubmitAnswerHandler(gamification);
  const requestHelpHandler = createRequestHelpHandler(gamification);
  const getGameStateHandler = createGetGameStateHandler(gamification);
  const getGameSessionStateHandler = createGetGameSessionStateHandler(gamification);

  app.post(`${prefix}/gamification/quiz/:courseId`, startGameHandler);
  app.post(`${prefix}/gamification/answer`, submitAnswerHandler);
  app.post(`${prefix}/gamification/sidekick`, requestHelpHandler);
  app.get(`${prefix}/gamification/session/:sessionId`, getGameStateHandler);
  app.get(`${prefix}/gamification/session-state/:sessionId`, getGameSessionStateHandler);
}

// Export handlers for testing
export const startGameHandler = createStartGameHandler;
export const submitAnswerHandler = createSubmitAnswerHandler;
export const requestHelpHandler = createRequestHelpHandler;
export const getGameStateHandler = createGetGameStateHandler;
export const getGameSessionStateHandler = createGetGameSessionStateHandler;
