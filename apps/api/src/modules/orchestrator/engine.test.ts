import { Readable } from "node:stream";
import { DomainError } from "@plks/shared/errors";
import { type Result, err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OrchestratorDagEngine,
  defaultOrchestratorDagEngineOptions,
  executeOrchestratorDag,
  isErr,
  isOk,
} from "./engine.js";
import type { PipelineContext } from "./nodes.js";

// Mock adapters following PLKS patterns
class MockStorageAdapter implements IStorageAdapter {
  downloadFile: ReturnType<typeof vi.fn>;
  uploadFile: ReturnType<typeof vi.fn>;
  listDirectory: ReturnType<typeof vi.fn>;
  generatePresignedUrl: ReturnType<typeof vi.fn>;

  constructor() {
    this.downloadFile = vi.fn();
    this.uploadFile = vi.fn();
    this.listDirectory = vi.fn();
    this.generatePresignedUrl = vi.fn();
  }
}

class MockGraphWriter implements IKnowledgeGraphWriter {
  writeNode: ReturnType<typeof vi.fn>;
  writeIndex: ReturnType<typeof vi.fn>;
  writeQuiz: ReturnType<typeof vi.fn>;

  constructor() {
    this.writeNode = vi.fn();
    this.writeIndex = vi.fn();
    this.writeQuiz = vi.fn();
  }
}

class MockAiGateway implements IAIReasoningGateway {
  multimodalInfer: ReturnType<typeof vi.fn>;

  constructor() {
    this.multimodalInfer = vi.fn();
  }
}

const mockStorage = new MockStorageAdapter();
const mockGraphWriter = new MockGraphWriter();
const mockAiGateway = new MockAiGateway();

const sessionId = "123e4567-e89b-12d3-a456-426614174000";
const courseId = "CS101";

const sampleRawAsset = {
  sessionId,
  courseId,
  transcripts: [
    { start_time: "00:00:00", end_time: "00:01:00", text: "Introduction to ML" },
    { start_time: "00:01:00", end_time: "00:02:00", text: "Neural networks are powerful" },
  ],
  visualAssets: [
    { page_num: 1, b2_uri: "s3://bucket/slide1.png" },
    { page_num: 2, b2_uri: "s3://bucket/slide2.png" },
  ],
};

const sampleAiResult = {
  conceptNodes: [
    {
      conceptId: "123e4567-e89b-12d3-a456-426614174001",
      courseId,
      term: "Machine Learning",
      explanation: "A subset of AI",
      relatedTerms: ["Deep Learning"],
      sourceEvidence: {
        transcriptRef: "00:00:00",
        slideUri: "s3://bucket/slide1.png",
      },
    },
  ],
  quizItems: [
    {
      quizId: "123e4567-e89b-12d3-a456-426614174002",
      courseId,
      type: "multiple_choice",
      question: "What is ML?",
      options: ["A", "B", "C"],
      correctAnswer: "B",
      contextReference: "123e4567-e89b-12d3-a456-426614174001",
    },
  ],
};

const _samplePipelineContext: PipelineContext = {
  sessionId,
  courseId,
};

describe("OrchestratorDagEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates engine with default options", () => {
      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      expect(engine).toBeDefined();
      expect(engine.execute).toBeDefined();
    });

    it("creates engine with custom options", () => {
      const customOptions = {
        maxRetries: 5,
        baseDelayMs: 500,
      };

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        customOptions,
      );

      expect(engine).toBeDefined();
    });
  });

  describe("execute", () => {
    it("executes pipeline successfully with all nodes passing", async () => {
      // Setup mocks for successful pipeline execution
      // Node A: download raw asset - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async () => ok(Readable.from(rawAssetJson)));
      // Node B: generate presigned URLs (2 assets)
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      // Node D: AI execution
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) =>
          ok(sampleAiResult),
      );
      // Node F: write outputs
      mockGraphWriter.writeNode.mockImplementation(async (node: any) => ok(true));
      mockGraphWriter.writeIndex.mockImplementation(async (courseId: string, nodes: any[]) =>
        ok(true),
      );
      mockGraphWriter.writeQuiz.mockImplementation(async (courseId: string, items: any[]) =>
        ok(true),
      );

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      // Debug: check what we actually got
      if (result.isErr()) {
        expect(result.isOk()).toBe(true); // This will fail and show us the error
      }

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sessionId).toBe(sessionId);
        expect(result.value.courseId).toBe(courseId);
        expect(mockStorage.downloadFile).toHaveBeenCalledWith(`processing/${sessionId}.json`);
        expect(mockStorage.generatePresignedUrl).toHaveBeenCalledTimes(2);
        expect(mockAiGateway.multimodalInfer).toHaveBeenCalled();
        expect(mockGraphWriter.writeNode).toHaveBeenCalledTimes(1);
        expect(mockGraphWriter.writeIndex).toHaveBeenCalledTimes(1);
        expect(mockGraphWriter.writeQuiz).toHaveBeenCalledTimes(1);
      }
    });

    it("returns error when Node A (Load Data) fails with NOT_FOUND", async () => {
      // Node A: download fails with not found
      mockStorage.downloadFile.mockImplementation(async (uri: string) => {
        return err(DomainError.notFound("RawAsset", sessionId));
      });

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // The DAG engine passes through the error from the node
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("returns error when Node B (Sign URLs) fails with PRESIGNED_URL_FAILED", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      // Node B: generate presigned URL fails
      mockStorage.generatePresignedUrl.mockImplementation(
        async (uri: string, expirySeconds: number) => {
          return err(DomainError.presignedUrlFailed(new Error("B2 error")));
        },
      );

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("PRESIGNED_URL_FAILED");
      }
    });

    it("returns error when Node D (AI Execution) fails with AI_INFERENCE_FAILED", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      // Node B: presigned URLs (2 calls for 2 assets)
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      // Node D: AI inference fails
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) => {
          return err(DomainError.aiInferenceFailed(new Error("AI failed")));
        },
      );

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_INFERENCE_FAILED");
      }
    });

    it("returns error when Node E (Validation) fails with AI_VALIDATION_FAILED", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      // Node B: presigned URLs (2 calls for 2 assets)
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      // Node D: AI returns result (even invalid)
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) =>
          ok({ conceptNodes: [], quizItems: [] }),
      );
      // Node E: validation fails due to schema mismatch

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_VALIDATION_FAILED");
      }
    });

    it("returns error when Node F (Persist) fails on write with MARKDOWN_WRITE_FAILED", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      // Node B: presigned URLs (2 calls for 2 assets)
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      // Node D: AI execution
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) =>
          ok({ conceptNodes: [], quizItems: [] }),
      );
      // Node F: write fails
      mockGraphWriter.writeNode.mockImplementation(async (node: any) => {
        return err(DomainError.markdownWriteFailed(new Error("Disk full")));
      });

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MARKDOWN_WRITE_FAILED");
      }
    });

    it("executes nodes in correct topological order (A -> B -> C -> D -> E -> F)", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      // Node B: presigned URLs (2 calls)
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      // Node D: AI execution
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) =>
          ok({ conceptNodes: [], quizItems: [] }),
      );
      // Node E: validation (passes)
      // Node F: write succeeds
      mockGraphWriter.writeNode.mockImplementation(async (node: any) => ok(true));
      mockGraphWriter.writeIndex.mockImplementation(async (courseId: string, nodes: any[]) =>
        ok(true),
      );
      mockGraphWriter.writeQuiz.mockImplementation(async (courseId: string, items: any[]) =>
        ok(true),
      );

      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await engine.execute(initialContext);

      expect(result.isOk()).toBe(true);

      // Verify execution order
      // Node A: downloadFile should be called first (once)
      expect(mockStorage.downloadFile).toHaveBeenCalledTimes(1);
      // Node B: generatePresignedUrl should be called twice (for 2 assets)
      expect(mockStorage.generatePresignedUrl).toHaveBeenCalledTimes(2);
      // Node D: multimodalInfer should be called
      expect(mockAiGateway.multimodalInfer).toHaveBeenCalled();
      // Node F: writeNode should be called once (last node)
      expect(mockGraphWriter.writeNode).toHaveBeenCalledTimes(1);
    });
  });

  describe("executeOrchestratorDag (utility function)", () => {
    it("executes pipeline with utility function", async () => {
      // Node A: download succeeds - return a stream containing the JSON
      const rawAssetJson = JSON.stringify(sampleRawAsset);
      mockStorage.downloadFile.mockImplementation(async (uri: string) =>
        ok(Readable.from(rawAssetJson)),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide1.png"),
      );
      mockStorage.generatePresignedUrl.mockImplementationOnce(
        async (uri: string, expirySeconds: number) => ok("https://presigned/slide2.png"),
      );
      mockAiGateway.multimodalInfer.mockImplementation(
        async (systemPrompt: string, textPayload: string, imageUrls: string[]) =>
          ok(sampleAiResult),
      );
      mockGraphWriter.writeNode.mockImplementation(async (node: any) => ok(true));
      mockGraphWriter.writeIndex.mockImplementation(async (courseId: string, nodes: any[]) =>
        ok(true),
      );
      mockGraphWriter.writeQuiz.mockImplementation(async (courseId: string, items: any[]) =>
        ok(true),
      );

      const initialContext: PipelineContext = {
        sessionId,
        courseId,
      };

      const result = await executeOrchestratorDag(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        initialContext,
        { maxRetries: 0 },
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe("getNodeExecutionOrder", () => {
    it("returns execution order [A, B, C, D, E, F]", () => {
      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const order = engine.getNodeExecutionOrder();

      expect(order).toEqual(["A", "B", "C", "D", "E", "F"]);
    });
  });

  describe("getExecutionLevels", () => {
    it("returns levels with correct parallelization structure", () => {
      const engine = new OrchestratorDagEngine(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
        { maxRetries: 0 },
      );

      const levels = engine.getExecutionLevels();

      expect(levels).toBeDefined();
      expect(Array.isArray(levels)).toBe(true);
    });
  });

  describe("isOk utility", () => {
    it("correctly identifies Ok results", () => {
      const okResult = ok({ success: true } as const);

      expect(isOk(okResult)).toBe(true);
    });

    it("correctly identifies Err results", () => {
      const errResult = err(new DomainError("TEST_ERROR", "Test error"));

      expect(isOk(errResult)).toBe(false);
    });
  });

  describe("isErr utility", () => {
    it("correctly identifies Err results", () => {
      const errResult = err(new DomainError("TEST_ERROR", "Test error"));

      expect(isErr(errResult)).toBe(true);
    });

    it("correctly identifies Ok results", () => {
      const okResult = ok({ success: true } as const);

      expect(isErr(okResult)).toBe(false);
    });
  });
});
