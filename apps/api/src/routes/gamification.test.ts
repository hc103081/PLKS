// apps/api/src/routes/gamification.test.ts
import { type Result, err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock GamificationService following PLKS patterns
class MockGamificationService implements GamificationServiceInterface {
  startGame = vi.fn();
  submitAnswer = vi.fn();
  requestHelp = vi.fn();
  getGameState = vi.fn();
}

const mockGamification = new MockGamificationService();

const courseId = "CS101";
const sessionId = "123e4567-e89b-12d3-a456-426614174000";

describe("Gamification Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/gamification/quiz/:courseId", () => {
    it("starts a new game session", async () => {
      mockGamification.startGame.mockImplementation(async () =>
        ok({
          sessionId,
          quiz: {
            quizId: "q1",
            courseId,
            type: "multiple_choice" as const,
            question: "什麼是機器學習？",
            options: ["A. 影片壓縮", "B. 算法優化", "C. 數據訓練", "D. 介面設計"],
            correctAnswer: "C. 數據訓練",
            contextReference: "concept-1",
          },
        }),
      );

      const { startGameHandler } = await import("./gamification.js");
      const handler = startGameHandler(mockGamification as unknown as GamificationServiceInterface);

      const request = { params: { courseId }, body: {} };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith({ sessionId, quiz: expect.any(Object) });
      expect(mockGamification.startGame).toHaveBeenCalledWith(courseId);
    });

    it("returns 404 when no quiz items found", async () => {
      mockGamification.startGame.mockImplementation(async () =>
        err({ code: "NOT_FOUND", message: "QuizItems not found", cause: new Error("not found") }),
      );

      const { startGameHandler } = await import("./gamification.js");
      const handler = startGameHandler(mockGamification as unknown as GamificationServiceInterface);

      const request = { params: { courseId }, body: {} };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: "QuizItems not found" });
    });
  });

  describe("POST /api/gamification/answer", () => {
    it("submits answer and returns result", async () => {
      mockGamification.submitAnswer.mockImplementation(async () =>
        ok({
          session: {
            sessionId,
            courseId,
            state: "PLAYING" as const,
            quizItems: [],
            currentIndex: 0,
            score: 0,
            streak: 0,
            answers: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          isCorrect: true,
          xpEarned: 100,
        }),
      );

      const { submitAnswerHandler } = await import("./gamification.js");
      const handler = submitAnswerHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { body: { sessionId, userAnswer: "C. 數據訓練", timeSpentMs: 30000 } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        session: expect.any(Object),
        isCorrect: true,
        xpEarned: 100,
      });
      expect(mockGamification.submitAnswer).toHaveBeenCalledWith(sessionId, "C. 數據訓練", 30000);
    });

    it("returns 404 when session not found", async () => {
      mockGamification.submitAnswer.mockImplementation(async () =>
        err({ code: "NOT_FOUND", message: "GameSession not found", cause: new Error("not found") }),
      );

      const { submitAnswerHandler } = await import("./gamification.js");
      const handler = submitAnswerHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { body: { sessionId, userAnswer: "A", timeSpentMs: 10000 } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: "GameSession not found" });
    });
  });

  describe("POST /api/gamification/sidekick", () => {
    it("requests sidekick help", async () => {
      mockGamification.requestHelp.mockImplementation(async () =>
        ok({
          explanation: "這是一個關於機器學習的核心概念...",
          keyConcept: "機器學習",
          actionableHint: "嘗試回顧課本第五章關於監督學習的定義",
          encouragement: "很好的嘗試！繼續加油",
          relatedSlideUris: ["https://b2.example.com/slides/chapter5.png"],
        }),
      );

      const { requestHelpHandler } = await import("./gamification.js");
      const handler = requestHelpHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { params: { sessionId } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        explanation: expect.any(String),
        keyConcept: expect.any(String),
        actionableHint: expect.any(String),
        encouragement: expect.any(String),
        relatedSlideUris: expect.any(Array),
      });
      expect(mockGamification.requestHelp).toHaveBeenCalledWith(sessionId);
    });

    it("returns 404 when session not found", async () => {
      mockGamification.requestHelp.mockImplementation(async () =>
        err({ code: "NOT_FOUND", message: "GameSession not found", cause: new Error("not found") }),
      );

      const { requestHelpHandler } = await import("./gamification.js");
      const handler = requestHelpHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { params: { sessionId } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: "GameSession not found" });
    });
  });

  describe("GET /api/gamification/session/:sessionId", () => {
    it("returns game state", async () => {
      mockGamification.getGameState.mockImplementation(async () =>
        ok({
          sessionId,
          courseId,
          state: "PLAYING" as const,
          quizItems: [],
          currentIndex: 0,
          score: 0,
          streak: 0,
          answers: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const { getGameStateHandler } = await import("./gamification.js");
      const handler = getGameStateHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { params: { sessionId } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        sessionId,
        courseId,
        state: "PLAYING",
        quizItems: [],
        currentIndex: 0,
        score: 0,
        streak: 0,
        answers: [],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockGamification.getGameState).toHaveBeenCalledWith(sessionId);
    });

    it("returns 404 when session not found", async () => {
      mockGamification.getGameState.mockImplementation(async () =>
        err({ code: "NOT_FOUND", message: "GameSession not found", cause: new Error("not found") }),
      );

      const { getGameStateHandler } = await import("./gamification.js");
      const handler = getGameStateHandler(
        mockGamification as unknown as GamificationServiceInterface,
      );

      const request = { params: { sessionId } };
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(request as any, reply as any);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: "GameSession not found" });
    });
  });
});
