// packages/shared/src/contracts/IStorageAdapter.ts
import type { Readable } from "node:stream";
import type { Result } from "neverthrow";
import type { DomainError } from "../errors/domain-error.js";

export interface IStorageAdapter {
  /** 上傳檔案至 B2，回傳 URI (s3://bucket/path) */
  uploadFile(path: string, byteStream: Readable): Promise<Result<string, DomainError>>;

  /** 從 B2 下載檔案 */
  downloadFile(uri: string): Promise<Result<Readable, DomainError>>;

  /** 列出目錄下所有檔案 URI */
  listDirectory(prefix: string): Promise<Result<string[], DomainError>>;

  /** 產生預簽名 URL (供 NIM 讀取私有圖片、前端直傳) */
  generatePresignedUrl(uri: string, expirySeconds: number): Promise<Result<string, DomainError>>;
}
