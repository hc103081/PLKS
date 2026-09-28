import { type Result, err, ok } from "neverthrow";
// apps/api/src/routes/orchestrator.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "../core/entities/session.js";
import { DomainError } from "../core/errors/domain-errors.js";
import type { OrchestratorService } from "../modules/orchestrator/orchestrator.service.js";

describe("Orchestrator Routes", () => {
  let mockOrchestrator: {
    startSession: ReturnType<typeof vi.fn>;
    getSessionStatus: ReturnType<typeof vi.fn>;
    retrySession: ReturnType<typeof vi.fn>;
  };

  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const courseId = "CS101";

  beforeEach(() => {
    vi.clearAllMocks();

    mockOrchestrator = {
      startSession: vi.fn(),
      getSessionStatus: vi.fn(),
      retrySession: vi.fn(),
    };
  });

  it("POST /orchestrator/start creates new session", async () => {
    mockOrchestrator.startSession.mockImplementation(async () =>
      ok({ sessionId, status: "completed" }),
    );

    // Import route handler after mocks are set up
    const { startSessionHandler } = await import("./orchestrator.js");
    const handler = startSessionHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { body: { sessionId, courseId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({ sessionId, status: "completed" });
    expect(mockOrchestrator.startSession).toHaveBeenCalledWith(sessionId, courseId);
  });

  it("POST /orchestrator/start returns 400 on error", async () => {
    mockOrchestrator.startSession.mockImplementation(async () =>
      err(DomainError.invalidInput("Session exists")),
    );

    const { startSessionHandler } = await import("./orchestrator.js");
    const handler = startSessionHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { body: { sessionId, courseId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Session exists" });
  });

  it("GET /orchestrator/status/:sessionId returns session status", async () => {
    mockOrchestrator.getSessionStatus.mockImplementation(async () =>
      ok({ sessionId, status: "completed", error: undefined }),
    );

    const { getSessionStatusHandler } = await import("./orchestrator.js");
    const handler = getSessionStatusHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { params: { sessionId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ sessionId, status: "completed" });
    expect(mockOrchestrator.getSessionStatus).toHaveBeenCalledWith(sessionId);
  });

  it("GET /orchestrator/status/:sessionId returns 404 on not found", async () => {
    mockOrchestrator.getSessionStatus.mockImplementation(async () =>
      err(DomainError.notFound("Session", sessionId)),
    );

    const { getSessionStatusHandler } = await import("./orchestrator.js");
    const handler = getSessionStatusHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { params: { sessionId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: `Session not found: ${sessionId}` });
  });

  it("POST /orchestrator/retry/:sessionId retries failed session", async () => {
    mockOrchestrator.retrySession.mockImplementation(async () =>
      ok({ sessionId, status: "completed" }),
    );

    const { retrySessionHandler } = await import("./orchestrator.js");
    const handler = retrySessionHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { params: { sessionId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ sessionId, status: "completed" });
    expect(mockOrchestrator.retrySession).toHaveBeenCalledWith(sessionId);
  });

  it("POST /orchestrator/retry/:sessionId returns 400 on error", async () => {
    mockOrchestrator.retrySession.mockImplementation(async () =>
      err(DomainError.invalidInput("Cannot retry")),
    );

    const { retrySessionHandler } = await import("./orchestrator.js");
    const handler = retrySessionHandler(mockOrchestrator as unknown as OrchestratorService);

    const request = { params: { sessionId } };
    const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    await handler(request as any, reply as any);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Cannot retry" });
  });
});
