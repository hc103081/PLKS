// apps/api/src/modules/export/export.service.test.ts
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IStructuredStore } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { QuizItemPayload } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportService } from "./export.service.js";
import { DomainError } from "../../core/errors/domain-errors.js";

// Mock implementations
function createMockStorage(): IStorageAdapter {
  const storedFiles = new Map<string, string>();
  const uploadedFiles = new Map<string, { content: string; contentType: string }>();

  return {
    async uploadFile(path: string, byteStream: Readable): Promise<Result<string, DomainError>> {
      try {
        const chunks: string[] = [];
        for await (const chunk of byteStream) {
          chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
        }
        const content = chunks.join("");
        storedFiles.set(path, content);
        uploadedFiles.set(path, { content, contentType: "application/octet-stream" });
        return ok(`s3://test-bucket/${path}`);
      } catch (cause) {
        return err(DomainError.unknown(cause));
      }
    },

    async downloadFile(uri: string): Promise<Result<Readable, DomainError>> {
      const path = uri.replace("s3://test-bucket/", "");
      const content = storedFiles.get(path);
      if (!content) {
        return err(DomainError.notFound("File", path));
      }
      const stream = new Readable({
        read() {
          this.push(content);
          this.push(null);
        },
      });
      return ok(stream);
    },

    async listDirectory(prefix: string): Promise<Result<string[], DomainError>> {
      const matches: string[] = [];
      for (const [path] of storedFiles.keys()) {
        if (path.startsWith(prefix)) {
          matches.push(`s3://test-bucket/${path}`);
        }
      }
      return ok(matches);
    },

    async generatePresignedUrl(
      uri: string,
      expirySeconds: number,
    ): Promise<Result<string, DomainError>> {
      if (!uri.startsWith("s3://")) {
        return err(DomainError.invalidInput("URI must start with s3://"));
      }
      return ok(`${uri}?presigned=true&expires=${expirySeconds}`);
    },
  };
}

function createMockStructuredStore(): IStructuredStore {
  const courses: any[] = [];
  const conceptNodes: any[] = [];
  const quizItems: any[] = [];
  const exportedConceptNodes = new Set<string>();
  const exportedQuizItems = new Set<string>();

  return {
    // Courses
    createCourse: async () => ({ id: "test-course-id" } as any),
    getCoursesByUser: async () => [],
    getCourseById: async (id) => ({ id, userId: "test-user-id", name: "Test Course", b2ExportDir: "s3://test-bucket/vault/test-course" } as any),
    updateCourse: async () => ({} as any),
    deleteCourse: async () => {},

    // Concept Nodes
    upsertConceptNodes: async (nodes) => {
      conceptNodes.push(...nodes);
      return nodes.map((n) => ({ ...n, id: `${n.conceptId}-db-id` }));
    },
    getConceptNodesByCourse: async (courseId) => {
      return conceptNodes.filter((n) => n.courseId === courseId && !exportedConceptNodes.has(n.conceptId));
    },
    markConceptNodesExported: async (ids, b2Uris) => {
      for (const id of ids) {
        exportedConceptNodes.add(id);
      }
      return;
    },

    // Quiz Items
    upsertQuizItems: async (items) => {
      quizItems.push(...items);
      return items.map((i) => ({ ...i, id: `${i.quizId}-db-id` }));
    },
    getQuizItemsByCourse: async (courseId) => {
      return quizItems.filter((q) => q.courseId === courseId && !exportedQuizItems.has(q.quizId));
    },
    markQuizItemsExported: async (ids, b2Uri) => {
      for (const id of ids) {
        exportedQuizItems.add(id);
      }
      return;
    },

    // Progress / Logs / Chat - simplified for export testing
    upsertProgress: async () => {},
    getDueReviews: async () => [],
    logAnswer: async () => {},
    getChatHistory: async () => [],
    appendChatMessage: async () => {},

    // Realtime subscriptions - simplified
    subscribeProgress: () => () => {},
    subscribeChatMessages: () => () => {},
  };
}

function createMockGraphWriter(): IKnowledgeGraphWriter {
  const writtenFiles = new Map<string, string>();

  return {
    writeNode: (node) => {
      const content = `---\nconceptId: "${node.conceptId}"\ncourseId: "${node.courseId}"\nterm: "${node.term}"\nexplanation: "${node.explanation}"\nrelatedTerms: [${node.relatedTerms.map((t) => `"${t}"`).join(", ")}]\nsourceEvidence:\n  transcriptRef: "${node.sourceEvidence.transcriptRef}"\n  slideUri: "${node.sourceEvidence.slideUri}"\n---\n\n# ${node.term}\n\n${node.explanation}`;
      writtenFiles.set(node.conceptId, content);
      return content;
    },
    writeIndex: (courseId, nodes) => {
      const content = `# ${courseId} - Course Index\n\n` +
        nodes.map((n) => `- [[${n.term}]]`).join("\n");
      writtenFiles.set(`${courseId}-index`, content);
      return content;
    },
    writeQuizJson: (courseId, items) => {
      const content = JSON.stringify({
        exportedAt: new Date().toISOString(),
        courseId,
        items: items.map((i) => ({
          quizId: i.quizId,
          type: i.type,
          question: i.question,
          options: i.options,
          correctAnswer: i.correctAnswer,
          contextReference: i.contextReference,
        })),
      }, null, 2);
      writtenFiles.set(`${courseId}-quiz.json`, content);
      return content;
    },
  };
}

describe("ExportService", () => {
  let storage: IStorageAdapter;
  let structuredStore: IStructuredStore;
  let graphWriter: IKnowledgeGraphWriter;
  let exportService: ExportService;

  const sampleConceptNodes: ConceptNodePayload[] = [
    {
      conceptId: "concept-1",
      courseId: "test-course",
      term: "機器學習",
      explanation: "AI 的一個子集，使系統能從數據中學習而無需明確編程。",
      relatedTerms: ["深度學習", "神經網絡"],
      sourceEvidence: {
        transcriptRef: "00:05:30-00:07:45",
        slideUri: "s3://test-bucket/vault/test-course/_assets/slide-1.png",
      },
    },
    {
      conceptId: "concept-2",
      courseId: "test-course",
      term: "深度學習",
      explanation: "使用多層神經網絡（深層架構）的機器學習子集。",
      relatedTerms: ["機器學習", "CNN", "RNN"],
      sourceEvidence: {
        transcriptRef: "00:20:00-00:25:00",
        slideUri: "s3://test-bucket/vault/test-course/_assets/slide-2.png",
      },
    },
  ];

  const sampleQuizItems: QuizItemPayload[] = [
    {
      quizId: "quiz-1",
      courseId: "test-course",
      type: "multiple_choice",
      question: "什麼是機器學習？",
      options: ["A. 手動編程", "B. 讓系統從數據中學習", "C. 使用固定規則"],
      correctAnswer: "B",
      contextReference: "concept-1",
    },
    {
      quizId: "quiz-2",
      courseId: "test-course",
      type: "true_false",
      question: "深度學習是機器學習的一部分",
      options: ["True", "False"],
      correctAnswer: "True",
      contextReference: "concept-2",
    },
  ];

  beforeEach(() => {
    storage = createMockStorage();
    structuredStore = createMockStructuredStore();
    graphWriter = createMockGraphWriter();
    exportService = new ExportService(storage, structuredStore, graphWriter);
  });

  describe("exportCourse", () => {
    it("should successfully export concept nodes and quiz items", async () => {
      // Setup: Add test data to structured store
      await structuredStore.upsertConceptNodes(sampleConceptNodes);
      await structuredStore.upsertQuizItems(sampleQuizItems);

      // Execute
      const result = await exportService.exportCourse("test-course");

      // Verify
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const exportResult = result.value;
        expect(exportResult.conceptNodesExported).toBe(2);
        expect(exportResult.quizItemsExported).toBe(2);
        expect(exportResult.indexExported).toBe(true);

        // Verify files were uploaded to storage
        const uploadedFiles = Array.from((storage as any).uploadedFiles.values());
        expect(uploadedFiles.length).toBeGreaterThanOrEqual(3); // 2 concept nodes + 1 quiz + 1 index

        // Verify concept nodes were marked as exported
        const conceptNodesAfterExport = await structuredStore.getConceptNodesByCourse("test-course");
        expect(conceptNodesAfterExport.value.length).toBe(0); // All should be exported

        // Verify quiz items were marked as exported
        const quizItemsAfterExport = await structuredStore.getQuizItemsByCourse("test-course");
        expect(quizItemsAfterExport.value.length).toBe(0); // All should be exported
      }
    });

    it("should return error when course has no data", async () => {
      // Execute with no data
      const result = await exportService.exportCourse("empty-course");

      // Verify
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should handle export failures gracefully", async () => {
      // Setup: Add test data
      await structuredStore.upsertConceptNodes(sampleConceptNodes);
      await structuredStore.upsertQuizItems(sampleQuizItems);

      // Mock storage to fail on upload
      const originalUpload = storage.uploadFile;
      storage.uploadFile = async (path, byteStream) => {
        if (path.includes("concept-1")) {
          return err(DomainError.unknown(new Error("Storage upload failed")));
        }
        return originalUpload.call(storage, path, byteStream);
      };

      // Execute
      const result = await exportService.exportCourse("test-course");

      // Verify partial success
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const exportResult = result.value;
        // Should have exported 1 concept node (concept-2 failed), 2 quiz items, and index
        expect(exportResult.conceptNodesExported).toBe(1);
        expect(exportResult.quizItemsExported).toBe(2);
        expect(exportResult.indexExported).toBe(true);
      }
    });

    it("should mark items as exported in structured store on success", async () => {
      // Setup
      await structuredStore.upsertConceptNodes(sampleConceptNodes);
      await structuredStore.upsertQuizItems(sampleQuizItems);

      // Execute
      await exportService.exportCourse("test-course");

      // Verify
      const conceptNodes = await structuredStore.getConceptNodesByCourse("test-course");
      const quizItems = await structuredStore.getQuizItemsByCourse("test-course");

      expect(conceptNodes.length).toBe(0);
      expect(quizItems.length).toBe(0);
    });
  });

  describe("exportAllCourses", () => {
    it("should export all courses for a user", async () => {
      // Setup: Create test data for multiple courses
      await structuredStore.upsertConceptNodes([
        ...sampleConceptNodes.map((n) => ({ ...n, courseId: "course-1" })),
        ...sampleConceptNodes.map((n) => ({ ...n, courseId: "course-2", term: `${n.term} 2` })),
      ]);
      await structuredStore.upsertQuizItems([
        ...sampleQuizItems.map((q) => ({ ...q, courseId: "course-1" })),
        ...sampleQuizItems.map((q) => ({ ...q, courseId: "course-2", question: `${q.question} 2` })),
      ]);
      // Mock getCoursesByUser to return our test courses
      const originalGetCourses = structuredStore.getCoursesByUser;
      structuredStore.getCoursesByUser = async (userId) => {
        return [
          { id: "course-1", userId, name: "Course 1", b2ExportDir: "s3://test-bucket/vault/course-1" },
          { id: "course-2", userId, name: "Course 2", b2ExportDir: "s3://test-bucket/vault/course-2" },
        ] as any;
      };

      // Execute
      const result = await exportService.exportAllCourses("test-user-id");

      // Verify
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const exportResults = result.value;
        expect(exportResults.length).toBe(2);
        exportResults.forEach((courseResult) => {
          expect(courseResult.conceptNodesExported).toBe(2);
          expect(courseResult.quizItemsExported).toBe(2);
          expect(courseResult.indexExported).toBe(true);
        });
      }
    });
  });
});