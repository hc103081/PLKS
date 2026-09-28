// packages/shared/src/errors/domain-error.ts
import type { Result } from "neverthrow";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }

  static storageUploadFailed(cause?: unknown): DomainError {
    return new DomainError("STORAGE_UPLOAD_FAILED", "Failed to upload file to storage", cause);
  }

  static storageDownloadFailed(cause?: unknown): DomainError {
    return new DomainError(
      "STORAGE_DOWNLOAD_FAILED",
      "Failed to download file from storage",
      cause,
    );
  }

  static storageListFailed(cause?: unknown): DomainError {
    return new DomainError("STORAGE_LIST_FAILED", "Failed to list directory", cause);
  }

  static presignedUrlFailed(cause?: unknown): DomainError {
    return new DomainError("PRESIGNED_URL_FAILED", "Failed to generate presigned URL", cause);
  }

  static storageAccessDenied(cause?: unknown): DomainError {
    return new DomainError("STORAGE_ACCESS_DENIED", "Access denied to storage", cause);
  }

  static aiInferenceFailed(cause?: unknown): DomainError {
    return new DomainError("AI_INFERENCE_FAILED", "AI inference failed", cause);
  }

  static aiValidationFailed(cause?: unknown): DomainError {
    return new DomainError("AI_VALIDATION_FAILED", "AI output validation failed", cause);
  }

  static markdownWriteFailed(cause?: unknown): DomainError {
    return new DomainError("MARKDOWN_WRITE_FAILED", "Failed to write markdown to storage", cause);
  }

  static ingestionFailed(cause?: unknown): DomainError {
    return new DomainError("INGESTION_FAILED", "Ingestion pipeline failed", cause);
  }

  static dagExecutionFailed(node: string, cause?: unknown): DomainError {
    return new DomainError("DAG_EXECUTION_FAILED", `DAG node ${node} failed`, cause);
  }

  static notFound(resource: string, id: string): DomainError {
    return new DomainError("NOT_FOUND", `${resource} not found: ${id}`);
  }

  static invalidInput(message: string): DomainError {
    return new DomainError("INVALID_INPUT", message);
  }
}

export type DomainResult<T> = Result<T, DomainError>;
