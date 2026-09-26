// packages/shared/src/contracts/IStorageAdapter.ts
import type { Readable } from 'node:stream';

export interface IStorageAdapter {
  /** 上傳檔案至 B2，回傳 URI (s3://bucket/path) */
  uploadFile(path: string, byteStream: Readable): Promise<string>;

  /** 從 B2 下載檔案 */
  downloadFile(uri: string): Promise<Readable>;

  /** 列出目錄下所有檔案 URI */
  listDirectory(prefix: string): Promise<string[]>;

  /** 產生預簽名 URL (供 NIM 讀取私有圖片、前端直傳) */
  generatePresignedUrl(uri: string, expirySeconds: number): Promise<string>;
}