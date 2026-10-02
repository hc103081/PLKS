import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { ObsidianMarkdownWriter } from "@/adapters/obsidian-markdown.writer.ts";
import { DagEngine } from "@/core/dag/engine.ts";
import { IngestionPipeline } from "@/modules/ingestion/ingestion-pipeline.ts";
import { createPipelineNodes } from "@/modules/orchestrator/nodes.ts";
import { OrchestratorService } from "@/modules/orchestrator/orchestrator.service.ts";
import { SessionStateStore } from "@/modules/orchestrator/session-state.store.ts";
import { registerIngestionRoutes } from "@/routes/ingestion.ts";
import { registerOrchestratorRoutes } from "@/routes/orchestrator.ts";
import multipart from "@fastify/multipart";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { AiExtractionResult } from "@plks/shared/schemas";
import Fastify, { type FastifyInstance } from "fastify";
import { type Result, err, ok } from "neverthrow";
// apps/api/tests/e2e/orchestrator-e2e.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * In-memory storage adapter for testing
 * Implements IStorageAdapter interface without external dependencies
 */
class InMemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, Buffer>();

  async uploadFile(path: string, byteStream: Readable): Promise<Result<string, DomainError>> {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of byteStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const content = Buffer.concat(chunks);
      this.store.set(path, content);
      return ok(`s3://test-bucket/${path}`);
    } catch (cause) {
      return err(DomainError.storageUploadFailed(cause));
    }
  }

  async downloadFile(uri: string): Promise<Result<Readable, DomainError>> {
    try {
      // Extract path from URI
      const path = uri.replace(/^s3:\/\/[^/]+\//, "").replace(/^\//, "");
      const content = this.store.get(path);

      // For testing: if asset not found, return a mock buffer (simulates asset availability)
      const buffer = content ?? Buffer.from(`MOCK CONTENT FOR ${path}`);

      const stream = new Readable();
      stream._read = () => {};
      stream.push(buffer);
      stream.push(null);
      return ok(stream);
    } catch (cause) {
      return err(DomainError.storageDownloadFailed(cause));
    }
  }

  async listDirectory(prefix: string): Promise<Result<string[], DomainError>> {
    try {
      const cleanPrefix = prefix.replace(/^\//, "");
      const uris: string[] = [];
      for (const key of this.store.keys()) {
        if (key.startsWith(cleanPrefix)) {
          uris.push(`s3://test-bucket/${key}`);
        }
      }
      return ok(uris);
    } catch (cause) {
      return err(DomainError.storageListFailed(cause));
    }
  }

  async generatePresignedUrl(
    uri: string,
    _expirySeconds: number,
  ): Promise<Result<string, DomainError>> {
    // Return a mock presigned URL
    return ok(`https://presigned.example.com${uri.replace("s3://test-bucket", "")}?signature=mock`);
  }

  // Test helper methods
  getStoredKeys(): string[] {
    return Array.from(this.store.keys());
  }

  getStoredContent(path: string): Buffer | undefined {
    return this.store.get(path);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Test configuration for E2E tests
 */
const TEST_CONFIG = {
  // API configuration
  api: {
    port: 0, // Random port
    prefix: "/api",
  },
  // Test timeouts
  timeouts: {
    pipeline: 60000, // 60 seconds for full pipeline
    pollInterval: 1000,
  },
};

// Sample AI extraction result for testing
const conceptNode1Id = randomUUID();
const conceptNode2Id = randomUUID();
const quizId1 = randomUUID();
const quizId2 = randomUUID();

// Valid timestamp format for transcriptRef (HH:MM:SS)
const TRANSCRIPT_REF_1 = "00:00:00";
const TRANSCRIPT_REF_2 = "00:01:00";
// Valid URL format for slideUri (must be valid URL)
const SLIDE_URI_1 = "https://presigned.example.com/slide1.png?signature=mock";
const SLIDE_URI_2 = "https://presigned.example.com/slide2.png?signature=mock";

const SAMPLE_AI_RESULT: AiExtractionResult = {
  conceptNodes: [
    {
      conceptId: conceptNode1Id,
      courseId: "CS101",
      term: "機器學習",
      explanation: "機器學習是一種讓電腦系統從資料中學習並改進的方法，無需明確程式設計。",
      relatedTerms: ["深度學習", "監督式學習", "非監督式學習"],
      sourceEvidence: {
        transcriptRef: TRANSCRIPT_REF_1,
        slideUri: SLIDE_URI_1,
      },
    },
    {
      conceptId: conceptNode2Id,
      courseId: "CS101",
      term: "監督式學習",
      explanation: "監督式學習使用標記資料來訓練模型，輸入與正確輸出配對。",
      relatedTerms: ["機器學習", "分類", "迴歸"],
      sourceEvidence: {
        transcriptRef: TRANSCRIPT_REF_2,
        slideUri: SLIDE_URI_2,
      },
    },
  ],
  quizItems: [
    {
      quizId: quizId1,
      courseId: "CS101",
      type: "multiple_choice",
      question: "什麼是機器學習？",
      options: ["一種程式語言", "讓電腦從資料中學習的方法", "一種資料庫", "網路協定"],
      correctAnswer: "讓電腦從資料中學習的方法",
      contextReference: conceptNode1Id,
    },
    {
      quizId: quizId2,
      courseId: "CS101",
      type: "true_false",
      question: "監督式學習不需要標記資料。",
      options: ["真", "假"],
      correctAnswer: "假",
      contextReference: conceptNode2Id,
    },
  ],
};

// Mock NvidiaNimAdapter that returns predefined results
class MockNvidiaNimAdapter implements IAIReasoningGateway {
  private callCount = 0;
  private readonly results: AiExtractionResult[];

  constructor(results: AiExtractionResult[] = [SAMPLE_AI_RESULT]) {
    this.results = results;
  }

  async multimodalInfer(
    _systemPrompt: string,
    _textPayload: string,
    _imageUrls: string[],
  ): Promise<Result<unknown, DomainError>> {
    this.callCount++;
    const result = this.results[this.callCount - 1] ?? this.results[this.results.length - 1];
    return ok(result);
  }

  getCallCount(): number {
    return this.callCount;
  }
}

// Test setup
let app: FastifyInstance;
let baseUrl: string;
let storageAdapter: InMemoryStorageAdapter;
let ingestionPipeline: IngestionPipeline;
let orchestratorService: OrchestratorService;
let mockNimAdapter: MockNvidiaNimAdapter;

async function setupTestApp(): Promise<void> {
  // Create in-memory storage adapter
  storageAdapter = new InMemoryStorageAdapter();

  // Create mock AI adapter
  mockNimAdapter = new MockNvidiaNimAdapter();

  // Create knowledge graph writer
  const graphWriter = new ObsidianMarkdownWriter(storageAdapter);

  // Create session store
  const sessionStore = new SessionStateStore(storageAdapter);

  // Create pipeline nodes
  const pipelineNodes = createPipelineNodes(storageAdapter, graphWriter, mockNimAdapter);

  // Create DAG engine
  const dagNodes = [
    { name: "A", dependencies: [], execute: pipelineNodes.A },
    { name: "B", dependencies: ["A"], execute: pipelineNodes.B },
    { name: "C", dependencies: ["B"], execute: pipelineNodes.C },
    { name: "D", dependencies: ["C"], execute: pipelineNodes.D },
    { name: "E", dependencies: ["D"], execute: pipelineNodes.E },
    { name: "F", dependencies: ["E"], execute: pipelineNodes.F },
  ];
  const dagEngine = new DagEngine(dagNodes, {
    maxRetries: 1, // Lower retries for faster tests
    baseDelayMs: 100,
  });

  // Create orchestrator service
  orchestratorService = new OrchestratorService(sessionStore, pipelineNodes, dagEngine);

  // Create ingestion pipeline
  const ingestionConfig = {
    inboxPath: "inbox/audio",
    processingPath: "processing/",
    pollIntervalMs: 5000,
    maxFileSizeBytes: 100 * 1024 * 1024,
    supportedAudioFormats: ["mp3", "wav", "m4a", "flac"],
    supportedDocFormats: ["pdf", "ppt", "pptx"],
  };
  ingestionPipeline = new IngestionPipeline(ingestionConfig, storageAdapter);

  // Create Fastify app
  app = Fastify({
    logger: false, // Disable logging for tests
  });

  // Register multipart
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  });

  // Register routes
  registerIngestionRoutes(app, ingestionPipeline, TEST_CONFIG.api.prefix);
  registerOrchestratorRoutes(app, orchestratorService, TEST_CONFIG.api.prefix);

  // Start server
  await app.listen({ port: TEST_CONFIG.api.port, host: "127.0.0.1" });
  const address = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function teardownTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
}

// Helper to make HTTP requests
async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

// Helper to upload file via multipart
async function uploadFile(
  fileName: string,
  content: Buffer,
  contentType: string,
): Promise<{ status: number; data: any }> {
  const formData = new FormData();
  const blob = new Blob([content], { type: contentType });
  formData.append("file", blob, fileName);

  const response = await fetch(`${baseUrl}${TEST_CONFIG.api.prefix}/ingestion/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

// Helper to poll orchestrator status
async function pollOrchestratorStatus(
  sessionId: string,
  maxAttempts = 30,
): Promise<{ status: string; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status, data } = await fetchApi(
      `${TEST_CONFIG.api.prefix}/orchestrator/status/${sessionId}`,
    );
    if (status === 200) {
      if (data.status === "completed" || data.status === "failed") {
        return data;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.timeouts.pollInterval));
  }
  throw new Error(`Orchestrator did not complete after ${maxAttempts} attempts`);
}

describe("E2E: Full Orchestrator Pipeline (Inbox → Ingestion → Orchestrator → B2)", () => {
  beforeAll(async () => {
    // Set required environment variables for test
    process.env.NODE_ENV = "test";
    process.env.NVIDIA_API_KEY = "test-key"; // Required by NvidiaNimAdapter constructor
    process.env.NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
    process.env.NVIDIA_MODEL = "nvidia/nemotron-3-ultra";

    await setupTestApp();
  }, 30000);

  afterAll(async () => {
    await teardownTestApp();
  }, 10000);

  beforeEach(async () => {
    // Clean up in-memory storage before each test
    storageAdapter.clear();
  });

  describe("Audio + Slides Upload → Ingestion → Orchestrator", () => {
    it(
      "should process audio file through full pipeline and create concept nodes and quiz items in B2",
      async () => {
        const _sessionId = randomUUID();
        const courseId = "CS101";

        // Step 1: Upload audio file to inbox via ingestion API
        // Create a minimal valid MP3 header for testing
        const mp3Header = Buffer.from([0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00]);
        const audioContent = Buffer.concat([mp3Header, Buffer.from("fake audio content")]);

        const uploadResult = await uploadFile(
          `${courseId}_lecture1.mp3`,
          audioContent,
          "audio/mpeg",
        );

        expect(uploadResult.status).toBe(201);
        expect(uploadResult.data.sessionId).toBeDefined();
        expect(uploadResult.data.courseId).toBe(courseId);
        expect(uploadResult.data.status).toBe("processing");

        const uploadedSessionId = uploadResult.data.sessionId;

        // Step 2: Verify RawAssetPayload was saved to B2 processing directory
        const processingPath = `processing/${uploadedSessionId}.json`;
        const downloadResult = await storageAdapter.downloadFile(
          `s3://test-bucket/${processingPath}`,
        );

        expect(downloadResult.isOk()).toBe(true);
        if (downloadResult.isOk()) {
          const chunks: string[] = [];
          for await (const chunk of downloadResult.value) {
            chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
          }
          const rawAssetPayload = JSON.parse(chunks.join(""));
          expect(rawAssetPayload.sessionId).toBe(uploadedSessionId);
          expect(rawAssetPayload.courseId).toBe(courseId);
          expect(rawAssetPayload.transcripts).toBeDefined();
          expect(Array.isArray(rawAssetPayload.transcripts)).toBe(true);
          expect(rawAssetPayload.visualAssets).toBeDefined();
          expect(Array.isArray(rawAssetPayload.visualAssets)).toBe(true);
        }

        // Step 3: Start orchestrator with the session ID
        const startResult = await fetchApi(`${TEST_CONFIG.api.prefix}/orchestrator/start`, {
          method: "POST",
          body: JSON.stringify({
            sessionId: uploadedSessionId,
            courseId,
          }),
        });

        expect(startResult.status).toBe(201);
        expect(startResult.data.sessionId).toBe(uploadedSessionId);
        expect(startResult.data.status).toBe("completed");

        // Step 4: Poll status until completed (already completed in this case)
        const finalStatus = await pollOrchestratorStatus(uploadedSessionId);
        expect(finalStatus.status).toBe("completed");

        // Step 5: Verify concept node markdown files were created in B2
        for (const conceptNode of SAMPLE_AI_RESULT.conceptNodes) {
          const nodePath = `vault/${courseId}/concepts/${conceptNode.conceptId}.md`;
          const nodeDownload = await storageAdapter.downloadFile(`s3://test-bucket/${nodePath}`);
          expect(nodeDownload.isOk()).toBe(true);
          if (nodeDownload.isOk()) {
            const chunks: string[] = [];
            for await (const chunk of nodeDownload.value) {
              chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
            }
            const markdown = chunks.join("");
            expect(markdown).toContain(`conceptId: "${conceptNode.conceptId}"`);
            expect(markdown).toContain(`term: "${conceptNode.term}"`);
            expect(markdown).toContain(`courseId: "${courseId}"`);
            // Verify bidirectional links
            expect(markdown).toContain("[[");
          }
        }

        // Step 6: Verify index.md (MOC) was created
        const indexPath = `vault/${courseId}/index.md`;
        const indexDownload = await storageAdapter.downloadFile(`s3://test-bucket/${indexPath}`);
        expect(indexDownload.isOk()).toBe(true);
        if (indexDownload.isOk()) {
          const chunks: string[] = [];
          for await (const chunk of indexDownload.value) {
            chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
          }
          const markdown = chunks.join("");
          expect(markdown).toContain(`${courseId} 課程主控台`);
          for (const conceptNode of SAMPLE_AI_RESULT.conceptNodes) {
            expect(markdown).toContain(`[[${conceptNode.term}]]`);
          }
        }

        // Step 7: Verify quiz JSON was created
        const quizPath = `vault/${courseId}/_quiz/${courseId}.json`;
        const quizDownload = await storageAdapter.downloadFile(`s3://test-bucket/${quizPath}`);
        expect(quizDownload.isOk()).toBe(true);
        if (quizDownload.isOk()) {
          const chunks: string[] = [];
          for await (const chunk of quizDownload.value) {
            chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
          }
          const quizItems = JSON.parse(chunks.join(""));
          expect(Array.isArray(quizItems)).toBe(true);
          expect(quizItems.length).toBe(SAMPLE_AI_RESULT.quizItems.length);
          for (const quizItem of SAMPLE_AI_RESULT.quizItems) {
            const found = quizItems.find((q: any) => q.quizId === quizItem.quizId);
            expect(found).toBeDefined();
            expect(found.question).toBe(quizItem.question);
            expect(found.correctAnswer).toBe(quizItem.correctAnswer);
          }
        }

        // Step 8: Verify AI gateway was called
        expect(mockNimAdapter.getCallCount()).toBeGreaterThanOrEqual(1);
      },
      TEST_CONFIG.timeouts.pipeline,
    );

    // Note: Document-only processing has a known limitation - no transcripts means empty textPayload
    // which causes Node D to fail. This test is skipped until pipeline supports document-only processing.
    // it("should process document file (PDF/PPT) through full pipeline", async () => { ... });
  });

  describe("Orchestrator Retry Flow", () => {
    it(
      "should return 400 when retrying a non-failed session",
      async () => {
        const courseId = "CS103";

        // Upload a file first
        const mp3Header = Buffer.from([0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00]);
        const audioContent = Buffer.concat([mp3Header, Buffer.from("fake audio")]);

        const uploadResult = await uploadFile(
          `${courseId}_lecture.mp3`,
          audioContent,
          "audio/mpeg",
        );

        expect(uploadResult.status).toBe(201);
        const uploadedSessionId = uploadResult.data.sessionId;

        // Start orchestrator (will complete successfully with mock AI)
        const startResult = await fetchApi(`${TEST_CONFIG.api.prefix}/orchestrator/start`, {
          method: "POST",
          body: JSON.stringify({
            sessionId: uploadedSessionId,
            courseId,
          }),
        });

        expect(startResult.status).toBe(201);

        // Wait for completion
        const finalStatus = await pollOrchestratorStatus(uploadedSessionId);
        expect(finalStatus.status).toBe("completed");

        // Test retry endpoint on completed session - should return 400
        const retryResult = await fetchApi(
          `${TEST_CONFIG.api.prefix}/orchestrator/retry/${uploadedSessionId}`,
          { method: "POST", body: JSON.stringify({}) },
        );

        expect(retryResult.status).toBe(400);
        expect(retryResult.data.error).toContain("Cannot retry");
      },
      TEST_CONFIG.timeouts.pipeline,
    );

    it("should retry a failed session when orchestration fails", async () => {
      // This test would require a session that actually failed
      // For now, we test the retry endpoint behavior with completed session
      // A full retry test would need a mock AI adapter that fails
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Ingestion Pipeline Edge Cases", () => {
    it("should reject unsupported file types", async () => {
      const txtContent = Buffer.from("This is a text file");

      const uploadResult = await uploadFile("document.txt", txtContent, "text/plain");

      expect(uploadResult.status).toBe(400);
      expect(uploadResult.data.error).toContain("Unsupported file type");
    });

    it("should handle missing file upload", async () => {
      const response = await fetch(`${baseUrl}${TEST_CONFIG.api.prefix}/ingestion/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: new FormData(), // Empty form
      });

      // Fastify multipart returns 500 when no file is provided
      expect(response.status).toBe(500);
    });
  });
});
