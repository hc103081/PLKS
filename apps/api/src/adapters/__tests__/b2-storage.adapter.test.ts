import { Readable } from "node:stream";
import { DomainError } from "@plks/shared/errors";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { B2StorageAdapter } from "../b2-storage.adapter";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: vi.fn().mockImplementation(() => ({
    done: vi.fn(),
  })),
}));

import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

describe("B2StorageAdapter", () => {
  let adapter: B2StorageAdapter;
  let mockS3Client: { send: Mock };
  let mockGetSignedUrl: Mock;
  let mockUploadDone: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment variables
    process.env.B2_APPLICATION_KEY_ID = "test-key-id";
    process.env.B2_APPLICATION_KEY = "test-secret-key";
    process.env.B2_BUCKET_NAME = "test-bucket";
    process.env.B2_ENDPOINT = "https://s3.test.backblazeb2.com";
    process.env.B2_REGION = "us-west-004";

    // Create mock instances
    mockS3Client = { send: vi.fn() };
    (S3Client as unknown as Mock).mockImplementation(() => mockS3Client);

    mockGetSignedUrl = vi.fn();
    (getSignedUrl as Mock).mockImplementation(mockGetSignedUrl);

    mockUploadDone = vi.fn();
    (Upload as unknown as Mock).mockImplementation(() => ({
      done: mockUploadDone,
    }));

    adapter = new B2StorageAdapter();
  });

  describe("uploadFile", () => {
    it("should upload file and return s3 URI on success", async () => {
      mockUploadDone.mockResolvedValue(undefined);

      const stream = Readable.from("test content");
      const result = await adapter.uploadFile("test/path.txt", stream);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("s3://test-bucket/test/path.txt");
      }
      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          client: mockS3Client,
          params: expect.objectContaining({
            Bucket: "test-bucket",
            Key: "test/path.txt",
            Body: stream,
          }),
        }),
      );
    });

    it("should return error on upload failure", async () => {
      mockUploadDone.mockRejectedValue(new Error("Network error"));

      const stream = Readable.from("test content");
      const result = await adapter.uploadFile("test/path.txt", stream);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("STORAGE_UPLOAD_FAILED");
      }
    });
  });

  describe("downloadFile", () => {
    it("should download file and return readable stream on success", async () => {
      const mockBody = Readable.from("file content");
      mockS3Client.send.mockResolvedValue({ Body: mockBody });

      const result = await adapter.downloadFile("s3://test-bucket/test/path.txt");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockBody);
      }
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it("should return error when body is empty", async () => {
      mockS3Client.send.mockResolvedValue({ Body: null });

      const result = await adapter.downloadFile("s3://test-bucket/test/path.txt");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("STORAGE_DOWNLOAD_FAILED");
      }
    });

    it("should return error on download failure", async () => {
      mockS3Client.send.mockRejectedValue(new Error("Not found"));

      const result = await adapter.downloadFile("s3://test-bucket/test/path.txt");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("STORAGE_DOWNLOAD_FAILED");
      }
    });
  });

  describe("listDirectory", () => {
    it("should list files and return URIs on success", async () => {
      mockS3Client.send.mockResolvedValue({
        Contents: [{ Key: "file1.txt" }, { Key: "file2.txt" }],
      });

      const result = await adapter.listDirectory("test/prefix");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(["s3://test-bucket/file1.txt", "s3://test-bucket/file2.txt"]);
      }
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(ListObjectsV2Command));
    });

    it("should return empty array when no contents", async () => {
      mockS3Client.send.mockResolvedValue({ Contents: [] });

      const result = await adapter.listDirectory("test/prefix");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("should return error on list failure", async () => {
      mockS3Client.send.mockRejectedValue(new Error("Access denied"));

      const result = await adapter.listDirectory("test/prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("STORAGE_LIST_FAILED");
      }
    });
  });

  describe("generatePresignedUrl", () => {
    it("should generate presigned URL on success", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned.url/test");

      const result = await adapter.generatePresignedUrl("s3://test-bucket/test/path.txt", 900);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("https://presigned.url/test");
      }
      expect(getSignedUrl).toHaveBeenCalledWith(mockS3Client, expect.any(GetObjectCommand), {
        expiresIn: 900,
      });
    });

    it("should return error on presigned URL generation failure", async () => {
      mockGetSignedUrl.mockRejectedValue(new Error("Invalid credentials"));

      const result = await adapter.generatePresignedUrl("s3://test-bucket/test/path.txt", 900);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("PRESIGNED_URL_FAILED");
      }
    });
  });

  describe("extractKeyFromUri", () => {
    it("should extract key from valid URI", async () => {
      // Test via generatePresignedUrl which calls extractKeyFromUri internally
      mockGetSignedUrl.mockResolvedValue("https://presigned.url/test");

      const result = await adapter.generatePresignedUrl("s3://test-bucket/path/to/file.txt", 900);

      expect(result.isOk()).toBe(true);
      // Verify getSignedUrl was called
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it("should return error on invalid URI format", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned.url/test");

      const result = await adapter.generatePresignedUrl("invalid-uri", 900);

      expect(result.isErr()).toBe(true);
    });
  });
});
