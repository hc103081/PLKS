import type { Readable } from "node:stream";
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import { type Result, err, ok } from "neverthrow";
// apps/api/src/modules/orchestrator/orchestrator.service.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DagEngine } from "../../core/dag/engine.js";
import { Session } from "../../core/entities/session.js";
import { DomainError } from "../../core/errors/domain-errors.js";
import { type PipelineContext, createPipelineNodes } from "./nodes.js";
import { OrchestratorService, type PipelineContext } from "./orchestrator.service.js";
import { SessionStateStore } from "./session-state.store.js";

describe("OrchestratorService", () => {
  let mockStorage: {
    downloadFile: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
    generatePresignedUrl: ReturnType<typeof vi.fn>;
    listDirectory: ReturnType<typeof vi.fn>;
  };
  let mockGraphWriter: {
    writeNode: ReturnType<typeof vi.fn>;
    writeIndex: ReturnType<typeof vi.fn>;
  };
  let mockAiGateway: {
    multimodalInfer: ReturnType<typeof vi.fn>;
  };
  let mockDagEngine: {
    execute: ReturnType<typeof vi.fn>;
  };
  let sessionStore: SessionStateStore;
  let service: OrchestratorService;

  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const courseId = "CS101";

  const sampleRawAsset = {
    sessionId,
    courseId,
    transcripts: [{ start_time: "00:00:00", end_time: "00:01:00", text: "Test" }],
    visualAssets: [{ page_num: 1, b2_uri: "s3://bucket/slide1.png" }],
  };

  const sampleAiResult = {
    conceptNodes: [
      {
        conceptId: "123e4567-e89b-12d3-a456-426614174001",
        courseId,
        term: "Test Concept",
        explanation: "Test explanation",
        relatedTerms: [],
        sourceEvidence: { transcriptRef: "00:00:00", slideUri: "s3://bucket/slide1.png" },
      },
    ],
    quizItems: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      downloadFile: vi.fn(),
      uploadFile: vi.fn(),
      generatePresignedUrl: vi.fn(),
      listDirectory: vi.fn(),
    };

    mockGraphWriter = {
      writeNode: vi.fn(),
      writeIndex: vi.fn(),
    };

    mockAiGateway = {
      multimodalInfer: vi.fn(),
    };

    mockDagEngine = {
      execute: vi.fn(),
    };

    sessionStore = new SessionStateStore(mockStorage as unknown as IStorageAdapter);

    const pipelineNodes = createPipelineNodes(
      mockStorage as unknown as IStorageAdapter,
      mockGraphWriter as unknown as IKnowledgeGraphWriter,
      mockAiGateway as unknown as IAIReasoningGateway,
    );

    service = new OrchestratorService(
      sessionStore,
      pipelineNodes,
      mockDagEngine as unknown as DagEngine<PipelineContext>,
    );
  });

  it("starts a new session and runs pipeline successfully", async () => {
    // Setup mocks for successful pipeline
    const session = Session.create(sessionId, courseId);
    const sessionJson = JSON.stringify({
      sessionId: session.sessionId,
      courseId: session.courseId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });

    mockDagEngine.execute.mockImplementation(async () => ok({ sessionId, courseId }));

    mockStorage.uploadFile.mockImplementation(async () => ok("s3://bucket/path"));
    mockStorage.downloadFile
      .mockImplementationOnce(async () => ok(Readable.from([sessionJson]))) // load session
      .mockImplementationOnce(async () => ok(Readable.from([JSON.stringify(sampleRawAsset)]))); // load raw asset
    mockStorage.generatePresignedUrl.mockImplementation(async () =>
      ok("https://presigned/slide1.png"),
    );
    mockAiGateway.multimodalInfer.mockImplementation(async () => ok(sampleAiResult));
    mockGraphWriter.writeNode.mockImplementation(async () => ok(true));
    mockGraphWriter.writeIndex.mockImplementation(async () => ok(true));

    const result = await service.startSession(sessionId, courseId);

    expect(result.isOk()).toBe(true);
    // Session should be saved with completed status
    expect(mockStorage.uploadFile).toHaveBeenCalled();
    expect(mockDagEngine.execute).toHaveBeenCalled();
  });

  it("returns error when session already exists", async () => {
    const existingSession = Session.create(sessionId, courseId);
    const completedSession = existingSession.complete();
    const sessionJson = JSON.stringify({
      sessionId: completedSession.sessionId,
      courseId: completedSession.courseId,
      status: completedSession.status,
      createdAt: completedSession.createdAt.toISOString(),
      updatedAt: completedSession.updatedAt.toISOString(),
    });

    mockStorage.downloadFile.mockImplementation(async () => ok(Readable.from([sessionJson])));
    mockStorage.uploadFile.mockImplementation(async () => ok("s3://bucket/path"));
    mockDagEngine.execute.mockImplementation(async () => ok({ sessionId, courseId }));

    const result = await service.startSession(sessionId, courseId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
    // Pipeline should not be executed
    expect(mockDagEngine.execute).not.toHaveBeenCalled();
  });

  it("gets session status", async () => {
    const session = Session.create(sessionId, courseId);
    const processingSession = session.startProcessing();
    const sessionJson = JSON.stringify({
      sessionId: processingSession.sessionId,
      courseId: processingSession.courseId,
      status: processingSession.status,
      createdAt: processingSession.createdAt.toISOString(),
      updatedAt: processingSession.updatedAt.toISOString(),
    });

    mockStorage.downloadFile.mockImplementation(async () => ok(Readable.from([sessionJson])));

    const result = await service.getSessionStatus(sessionId);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.sessionId).toBe(sessionId);
      expect(result.value.status).toBe("processing");
    }
  });

  it("retries failed session", async () => {
    const session = Session.create(sessionId, courseId);
    const failedSession = session.fail("Previous error");
    const sessionJson = JSON.stringify({
      sessionId: failedSession.sessionId,
      courseId: failedSession.courseId,
      status: failedSession.status,
      createdAt: failedSession.createdAt.toISOString(),
      updatedAt: failedSession.updatedAt.toISOString(),
      error: failedSession.error,
    });

    mockDagEngine.execute.mockImplementation(async () => ok({ sessionId, courseId }));

    mockStorage.downloadFile
      .mockImplementationOnce(async () => ok(Readable.from([sessionJson]))) // load session
      .mockImplementationOnce(async () => ok(Readable.from([JSON.stringify(sampleRawAsset)]))); // load raw asset
    mockStorage.uploadFile.mockImplementation(async () => ok("s3://bucket/path"));
    mockStorage.generatePresignedUrl.mockImplementation(async () =>
      ok("https://presigned/slide1.png"),
    );
    mockAiGateway.multimodalInfer.mockImplementation(async () => ok(sampleAiResult));
    mockGraphWriter.writeNode.mockImplementation(async () => ok(true));
    mockGraphWriter.writeIndex.mockImplementation(async () => ok(true));

    const result = await service.retrySession(sessionId);

    expect(result.isOk()).toBe(true);
  });

  it("returns error when retrying non-failed session", async () => {
    const session = Session.create(sessionId, courseId);
    session.complete();
    const sessionJson = JSON.stringify({
      sessionId: session.sessionId,
      courseId: session.courseId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });

    mockStorage.downloadFile.mockImplementation(async () => ok(Readable.from([sessionJson])));

    const result = await service.retrySession(sessionId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
  });
});
