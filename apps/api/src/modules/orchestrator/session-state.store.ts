// apps/api/src/modules/orchestrator/session-state.store.ts
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { type Result, err, ok } from "neverthrow";
import { Session } from "../../core/entities/session.js";
import { DomainError } from "../../core/errors/domain-errors.js";

export interface SessionState {
  sessionId: string;
  courseId: string;
  status: Session["status"];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export class SessionStateStore {
  private readonly storage: IStorageAdapter;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  private getSessionPath(sessionId: string): string {
    return `sessions/${sessionId}.json`;
  }

  private sessionToState(session: Session): SessionState {
    const state: SessionState = {
      sessionId: session.sessionId,
      courseId: session.courseId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
    if (session.error !== undefined) {
      state.error = session.error;
    }
    return state;
  }

  private stateToSession(state: SessionState): Session {
    return new Session(
      state.sessionId,
      state.courseId,
      state.status,
      new Date(state.createdAt),
      new Date(state.updatedAt),
      state.error,
    );
  }

  async save(session: Session): Promise<Result<boolean, DomainError>> {
    try {
      const state = this.sessionToState(session);
      const json = JSON.stringify(state, null, 2);
      const stream = Readable.from([json]);

      const result = await this.storage.uploadFile(this.getSessionPath(session.sessionId), stream);

      if (result.isErr()) {
        return err(DomainError.storageUploadFailed(result.error));
      }

      return ok(true);
    } catch (cause) {
      return err(DomainError.storageUploadFailed(cause));
    }
  }

  async load(sessionId: string): Promise<Result<Session, DomainError>> {
    try {
      const result = await this.storage.downloadFile(this.getSessionPath(sessionId));

      if (result.isErr()) {
        if (result.error.code === "NOT_FOUND") {
          return err(DomainError.notFound("session", sessionId));
        }
        return err(result.error);
      }

      const stream = result.value;
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      }
      const content = chunks.join("");
      const state: SessionState = JSON.parse(content);

      return ok(this.stateToSession(state));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (
        message.includes("404") ||
        message.includes("NotFound") ||
        message.includes("NoSuchKey")
      ) {
        return err(DomainError.notFound("session", sessionId));
      }
      return err(DomainError.storageDownloadFailed(cause));
    }
  }

  async listAll(): Promise<Result<string[], DomainError>> {
    try {
      const result = await this.storage.listDirectory("sessions/");
      return result;
    } catch (cause) {
      return err(DomainError.storageListFailed(cause));
    }
  }
}
