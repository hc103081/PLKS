import type { Readable } from "node:stream";
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { RawAssetPayload } from "@plks/shared/schemas";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { AiExtractionResult } from "@plks/shared/schemas";
import { type Result, err, ok } from "neverthrow";
// apps/api/src/modules/orchestrator/nodes.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "../../core/errors/domain-errors.js";
import { type PipelineContext, createPipelineNodes } from "./nodes.js";

describe("Pipeline Nodes A-F", () => {
  let mockStorage: {
    downloadFile: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
    generatePresignedUrl: ReturnType<typeof vi.fn>;
  };
  let mockGraphWriter: {
    writeNode: ReturnType<typeof vi.fn>;
    writeIndex: ReturnType<typeof vi.fn>;
  };
  let mockAiGateway: {
    multimodalInfer: ReturnType<typeof vi.fn>;
  };

  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const courseId = "CS101";

  const sampleRawAsset: RawAssetPayload = {
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

  const sampleAiResult: AiExtractionResult = {
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

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      downloadFile: vi.fn(),
      uploadFile: vi.fn(),
      generatePresignedUrl: vi.fn(),
    };

    mockGraphWriter = {
      writeNode: vi.fn(),
      writeIndex: vi.fn(),
      writeQuiz: vi.fn(),
    };

    mockAiGateway = {
      multimodalInfer: vi.fn(),
    };
  });

  describe("Node A: Load Data", () => {
    it("loads RawAssetPayload from B2", async () => {
      const json = JSON.stringify(sampleRawAsset);
      const stream = Readable.from([json]);
      mockStorage.downloadFile.mockImplementation(async () => ok(stream));

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = { sessionId, courseId };
      const result = await nodes.A(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.rawAsset).toEqual(sampleRawAsset);
      }
      expect(mockStorage.downloadFile).toHaveBeenCalledWith(`processing/${sessionId}.json`);
    });

    it("returns error when file not found", async () => {
      mockStorage.downloadFile.mockImplementation(async () =>
        err(DomainError.notFound("RawAsset", sessionId)),
      );

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = { sessionId, courseId };
      const result = await nodes.A(context);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Node B: Sign URLs", () => {
    it("generates presigned URLs for visual assets", async () => {
      mockStorage.generatePresignedUrl
        .mockImplementationOnce(async () => ok("https://presigned/slide1.png?token=1"))
        .mockImplementationOnce(async () => ok("https://presigned/slide2.png?token=2"));

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        rawAsset: sampleRawAsset,
      };
      const result = await nodes.B(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.signedUrls).toHaveLength(2);
        expect(result.value.signedUrls[0]).toContain("slide1.png");
        expect(result.value.signedUrls[1]).toContain("slide2.png");
      }
      expect(mockStorage.generatePresignedUrl).toHaveBeenCalledTimes(2);
    });

    it("returns error on presigned URL failure", async () => {
      mockStorage.generatePresignedUrl.mockImplementation(async () =>
        err(DomainError.presignedUrlFailed(new Error("Failed"))),
      );

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        rawAsset: sampleRawAsset,
      };
      const result = await nodes.B(context);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Node C: Assemble Prompt", () => {
    it("assembles prompt with transcript and signed URLs", async () => {
      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        rawAsset: sampleRawAsset,
        signedUrls: ["https://presigned/slide1.png", "https://presigned/slide2.png"],
      };
      const result = await nodes.C(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.systemPrompt).toContain("知識工程師");
        expect(result.value.textPayload).toContain("Introduction to ML");
        expect(result.value.textPayload).toContain("Neural networks");
        expect(result.value.imageUrls).toEqual([
          "https://presigned/slide1.png",
          "https://presigned/slide2.png",
        ]);
      }
    });
  });

  describe("Node D: AI Execution", () => {
    it("calls AI gateway with prompt and images", async () => {
      mockAiGateway.multimodalInfer.mockImplementation(async () => ok(sampleAiResult));

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        rawAsset: sampleRawAsset,
        signedUrls: ["https://presigned/slide1.png"],
        systemPrompt: "test prompt",
        textPayload: "test payload",
        imageUrls: ["https://presigned/slide1.png"],
      };
      const result = await nodes.D(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.aiResult).toEqual(sampleAiResult);
      }
      expect(mockAiGateway.multimodalInfer).toHaveBeenCalledWith("test prompt", "test payload", [
        "https://presigned/slide1.png",
      ]);
    });

    it("returns error on AI failure", async () => {
      mockAiGateway.multimodalInfer.mockImplementation(async () =>
        err(DomainError.aiInferenceFailed(new Error("AI failed"))),
      );

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        systemPrompt: "test",
        textPayload: "test",
        imageUrls: [],
      };
      const result = await nodes.D(context);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Node E: Validate Output", () => {
    it("validates AI result against schema", async () => {
      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        aiResult: sampleAiResult,
      };
      const result = await nodes.E(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.validatedResult).toEqual(sampleAiResult);
      }
    });

    it("returns error on validation failure", async () => {
      const invalidResult = {
        conceptNodes: [{ conceptId: "not-uuid" }],
        quizItems: [],
      };

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        aiResult: invalidResult as unknown as AiExtractionResult,
      };
      const result = await nodes.E(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AI_VALIDATION_FAILED");
      }
    });
  });

  describe("Node F: Persist", () => {
    it("writes concept nodes, index, and quiz items to B2", async () => {
      mockGraphWriter.writeNode.mockImplementation(async () => ok(true));
      mockGraphWriter.writeIndex.mockImplementation(async () => ok(true));
      mockGraphWriter.writeQuiz.mockImplementation(async () => ok(true));

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        validatedResult: sampleAiResult,
      };
      const result = await nodes.F(context);

      expect(result.isOk()).toBe(true);
      expect(mockGraphWriter.writeNode).toHaveBeenCalledTimes(1);
      expect(mockGraphWriter.writeIndex).toHaveBeenCalledTimes(1);
      expect(mockGraphWriter.writeQuiz).toHaveBeenCalledTimes(1);
      expect(mockGraphWriter.writeQuiz).toHaveBeenCalledWith(courseId, sampleAiResult.quizItems);
    });

    it("skips quiz write when no quiz items", async () => {
      mockGraphWriter.writeNode.mockImplementation(async () => ok(true));
      mockGraphWriter.writeIndex.mockImplementation(async () => ok(true));

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        validatedResult: { ...sampleAiResult, quizItems: [] },
      };
      const result = await nodes.F(context);

      expect(result.isOk()).toBe(true);
      expect(mockGraphWriter.writeNode).toHaveBeenCalledTimes(1);
      expect(mockGraphWriter.writeIndex).toHaveBeenCalledTimes(1);
      expect(mockGraphWriter.writeQuiz).not.toHaveBeenCalled();
    });

    it("returns error on write failure", async () => {
      mockGraphWriter.writeNode.mockImplementation(async () =>
        err(DomainError.markdownWriteFailed(new Error("Write failed"))),
      );

      const nodes = createPipelineNodes(
        mockStorage as unknown as IStorageAdapter,
        mockGraphWriter as unknown as IKnowledgeGraphWriter,
        mockAiGateway as unknown as IAIReasoningGateway,
      );

      const context: PipelineContext = {
        sessionId,
        courseId,
        validatedResult: sampleAiResult,
      };
      const result = await nodes.F(context);

      expect(result.isErr()).toBe(true);
    });
  });
});
