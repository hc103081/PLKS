import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import { type Result, err, ok } from "neverthrow";
// apps/api/src/modules/orchestrator/session-state.store.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "../../core/entities/session.js";
import { SessionStateStore } from "./session-state.store.js";

describe("SessionStateStore", () => {
  let mockStorage: {
    uploadFile: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
    listDirectory: ReturnType<typeof vi.fn>;
  };
  let store: SessionStateStore;

  const sessionId = "123e4567-e89b-12d3-a456-426614174000";
  const courseId = "CS101";

  const createSessionJson = (session: Session) =>
    JSON.stringify({
      sessionId: session.sessionId,
      courseId: session.courseId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      error: session.error,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      listDirectory: vi.fn(),
    };

    store = new SessionStateStore(mockStorage as unknown as IStorageAdapter);
  });

  it("saves session state to B2", async () => {
    const session = Session.create(sessionId, courseId);
    mockStorage.uploadFile.mockImplementation(async () => ok("s3://bucket/path"));

    const result = await store.save(session);

    expect(result.isOk()).toBe(true);
    expect(mockStorage.uploadFile).toHaveBeenCalled();

    const uploadCall = mockStorage.uploadFile.mock.calls[0];
    expect(uploadCall[0]).toBe(`sessions/${sessionId}.json`);

    const stream = uploadCall[1] as Readable;
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as string);
    }
    const content = chunks.join("");
    const saved = JSON.parse(content);
    expect(saved.sessionId).toBe(sessionId);
    expect(saved.courseId).toBe(courseId);
    expect(saved.status).toBe("pending");
  });

  it("loads session state from B2", async () => {
    const session = Session.create(sessionId, courseId);
    const json = createSessionJson(session);
    const stream = Readable.from([json]);

    mockStorage.downloadFile.mockImplementation(async () => ok(stream));

    const result = await store.load(sessionId);

    expect(result.isOk()).toBe(true);
    expect(mockStorage.downloadFile).toHaveBeenCalledWith(`sessions/${sessionId}.json`);

    if (result.isOk()) {
      expect(result.value.sessionId).toBe(sessionId);
      expect(result.value.courseId).toBe(courseId);
      expect(result.value.status).toBe("pending");
    }
  });

  it("returns error when session not found", async () => {
    mockStorage.downloadFile.mockImplementation(async () =>
      err(DomainError.notFound("Session", sessionId)),
    );

    const result = await store.load(sessionId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns error on download failure", async () => {
    mockStorage.downloadFile.mockImplementation(async () =>
      err(DomainError.storageDownloadFailed(new Error("Network error"))),
    );

    const result = await store.load(sessionId);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("STORAGE_DOWNLOAD_FAILED");
    }
  });

  it("returns error on save failure", async () => {
    const session = Session.create(sessionId, courseId);
    mockStorage.uploadFile.mockImplementation(async () =>
      err(DomainError.storageUploadFailed(new Error("Upload failed"))),
    );

    const result = await store.save(session);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("STORAGE_UPLOAD_FAILED");
    }
  });

  it("lists all session files", async () => {
    mockStorage.listDirectory.mockImplementation(async () =>
      ok(["s3://bucket/sessions/session1.json", "s3://bucket/sessions/session2.json"]),
    );

    const result = await store.listAll();

    expect(result.isOk()).toBe(true);
    expect(mockStorage.listDirectory).toHaveBeenCalledWith("sessions/");
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }
  });
});
