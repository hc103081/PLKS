import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { ObsidianMarkdownWriter } from "../obsidian-markdown.writer";

describe("ObsidianMarkdownWriter", () => {
  let writer: ObsidianMarkdownWriter;
  let mockStorage: {
    uploadFile: Mock;
    downloadFile: Mock;
  };

  const sampleNode: ConceptNodePayload = {
    conceptId: "123e4567-e89b-12d3-a456-426614174000",
    courseId: "course-101",
    term: "Machine Learning",
    explanation: "A subset of AI that enables systems to learn from data.",
    relatedTerms: ["Deep Learning", "Neural Networks", "Supervised Learning"],
    sourceEvidence: {
      transcriptRef: "00:15:30",
      slideUri: "s3://pkm-omni-vault/vault/course-101/slides/slide-5.png",
    },
  };

  const sampleNodes: ConceptNodePayload[] = [
    sampleNode,
    {
      ...sampleNode,
      conceptId: "123e4567-e89b-12d3-a456-426614174001",
      term: "Deep Learning",
      explanation: "A subset of ML using neural networks with many layers.",
      relatedTerms: ["Machine Learning", "Neural Networks"],
    },
    {
      ...sampleNode,
      conceptId: "123e4567-e89b-12d3-a456-426614174002",
      term: "Neural Networks",
      explanation: "Computing systems inspired by biological neural networks.",
      relatedTerms: ["Deep Learning", "Machine Learning"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
    };

    // Mock downloadFile to return a readable stream for asset copying
    mockStorage.downloadFile.mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: Readable.from("fake image content"),
    });

    mockStorage.uploadFile.mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: "s3://...",
    });

    writer = new ObsidianMarkdownWriter(mockStorage as unknown as IStorageAdapter);
  });

  describe("writeNode", () => {
    it("should generate markdown with frontmatter and content", async () => {
      const result = await writer.writeNode(sampleNode);

      expect(result.isOk()).toBe(true);
      expect(mockStorage.uploadFile).toHaveBeenCalled();

      // Verify the uploaded content - should be 2 calls: 1 for asset copy, 1 for markdown
      const uploadCalls = mockStorage.uploadFile.mock.calls;
      expect(uploadCalls.length).toBe(2);
      const uploadCall = uploadCalls[1]; // Second call is the markdown
      expect(uploadCall?.[0]).toBe(
        "vault/course-101/concepts/123e4567-e89b-12d3-a456-426614174000.md",
      );

      // Verify the stream content
      const stream = uploadCall?.[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      // Check frontmatter
      expect(content).toContain('conceptId: "123e4567-e89b-12d3-a456-426614174000"');
      expect(content).toContain('courseId: "course-101"');
      expect(content).toContain('term: "Machine Learning"');
      expect(content).toContain("tags:");
      expect(content).toContain("relatedTerms:");
      expect(content).toContain("  - Deep Learning");
      expect(content).toContain("  - Neural Networks");
      expect(content).toContain("  - Supervised Learning");
      expect(content).toContain("sourceEvidence:");
      expect(content).toContain('transcriptRef: "00:15:30"');
      expect(content).toContain(
        'slideUri: "s3://pkm-omni-vault/vault/course-101/slides/slide-5.png"',
      );

      // Check content
      expect(content).toContain("# Machine Learning");
      expect(content).toContain("## 解釋");
      expect(content).toContain("A subset of AI that enables systems to learn from data.");
      expect(content).toContain("## 相關概念");
      expect(content).toContain("- [[Deep Learning]]");
      expect(content).toContain("- [[Neural Networks]]");
      expect(content).toContain("- [[Supervised Learning]]");
      expect(content).toContain("## 來源證據");
      expect(content).toContain("**逐字稿**: 00:15:30");
      // Asset should reference _assets/ directory
      expect(content).toContain("_assets/slide-5.png");
    });

    it("should handle nodes with no related terms", async () => {
      const nodeNoRelated = { ...sampleNode, relatedTerms: [] };

      const result = await writer.writeNode(nodeNoRelated);

      expect(result.isOk()).toBe(true);

      const uploadCalls = mockStorage.uploadFile.mock.calls;
      expect(uploadCalls.length).toBe(2);
      const uploadCall = uploadCalls[1];
      const stream = uploadCall?.[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      expect(content).toContain("relatedTerms:");
      expect(content).toContain('  - ""');
      expect(content).not.toContain("## 相關概念");
    });

    it("should return error when storage upload fails", async () => {
      mockStorage.uploadFile.mockResolvedValue({
        isOk: () => false,
        isErr: () => true,
        error: new DomainError("STORAGE_UPLOAD_FAILED", "Upload failed"),
      });

      const result = await writer.writeNode(sampleNode);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MARKDOWN_WRITE_FAILED");
      }
    });

    it("should return error when storage throws", async () => {
      mockStorage.uploadFile.mockRejectedValue(new Error("Network error"));

      const result = await writer.writeNode(sampleNode);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MARKDOWN_WRITE_FAILED");
      }
    });
  });

  describe("writeIndex", () => {
    it("should generate MOC index with all nodes grouped by first letter", async () => {
      const result = await writer.writeIndex("course-101", sampleNodes);

      expect(result.isOk()).toBe(true);
      expect(mockStorage.uploadFile).toHaveBeenCalled();

      const uploadCall = mockStorage.uploadFile.mock.calls[0];
      expect(uploadCall[0]).toBe("vault/course-101/index.md");

      const stream = uploadCall[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      // Check frontmatter
      expect(content).toContain('courseId: "course-101"');
      expect(content).toContain('type: "course-index"');
      expect(content).toContain("nodeCount: 3");

      // Check content
      expect(content).toContain("# course-101 課程主控台 (MOC)");
      expect(content).toContain("## 概念節點索引");

      // Check grouped by letter
      expect(content).toContain("### D"); // Deep Learning
      expect(content).toContain("### M"); // Machine Learning
      expect(content).toContain("### N"); // Neural Networks

      // Check links with transcript refs
      expect(content).toContain("[[Deep Learning]] (00:15:30)");
      expect(content).toContain("[[Machine Learning]] (00:15:30)");
      expect(content).toContain("[[Neural Networks]] (00:15:30)");

      // Check quiz reference
      expect(content).toContain("## 測驗題庫");
      expect(content).toContain("_quiz/course-101.json");
    });

    it("should handle nodes starting with non-alphabetic characters", async () => {
      const nodesWithSpecial = [
        {
          ...sampleNode,
          conceptId: "123e4567-e89b-12d3-a456-426614174003",
          term: "123 Numbers",
        },
        {
          ...sampleNode,
          conceptId: "123e4567-e89b-12d3-a456-426614174004",
          term: "@Special",
        },
      ];

      const result = await writer.writeIndex("course-101", nodesWithSpecial);

      expect(result.isOk()).toBe(true);

      const uploadCall = mockStorage.uploadFile.mock.calls[0];
      const stream = uploadCall[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      expect(content).toContain("### #"); // Non-alphabetic grouped under #
      expect(content).toContain("[[123 Numbers]]");
      expect(content).toContain("[[@Special]]");
    });

    it("should return error when storage upload fails", async () => {
      mockStorage.uploadFile.mockResolvedValueOnce({
        isOk: () => false,
        isErr: () => true,
        error: new DomainError("STORAGE_UPLOAD_FAILED", "Upload failed"),
      });

      const result = await writer.writeIndex("course-101", sampleNodes);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MARKDOWN_WRITE_FAILED");
      }
    });

    it("should return error when storage throws", async () => {
      mockStorage.uploadFile.mockRejectedValue(new Error("Network error"));

      const result = await writer.writeIndex("course-101", sampleNodes);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MARKDOWN_WRITE_FAILED");
      }
    });
  });

  describe("getAssetFilename", () => {
    it("should extract filename from B2 URI", async () => {
      const nodeWithAsset = {
        ...sampleNode,
        sourceEvidence: {
          ...sampleNode.sourceEvidence,
          slideUri: "s3://pkm-omni-vault/vault/course-101/assets/diagram.png",
        },
      };

      await writer.writeNode(nodeWithAsset);

      // Second call is the markdown upload
      const uploadCall = mockStorage.uploadFile.mock.calls[1];
      const stream = uploadCall[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      expect(content).toContain("diagram.png");
    });
  });

  describe("escapeYamlString", () => {
    it("should escape special YAML characters", async () => {
      const nodeWithSpecialChars = {
        ...sampleNode,
        term: 'Term with "quotes" and \n newlines',
        explanation: "Explanation with \\ backslash",
      };

      await writer.writeNode(nodeWithSpecialChars);

      // Second call is the markdown upload
      const uploadCall = mockStorage.uploadFile.mock.calls[1];
      const stream = uploadCall[1];
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");

      expect(content).toContain('term: "Term with \\"quotes\\" and \\n newlines"');
      expect(content).toContain("Explanation with \\ backslash");
    });
  });
});
