import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
// apps/api/src/modules/ingestion/document-processor.ts
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { IngestionConfig, VisualAsset } from "./types.js";

export class DocumentProcessor {
  private readonly config: IngestionConfig;
  private readonly storage: IStorageAdapter;

  constructor(config: IngestionConfig, storage: IStorageAdapter) {
    this.config = config;
    this.storage = storage;
  }

  /**
   * Convert PDF/PPT to PNG images (one per page/slide)
   * Uses LibreOffice headless for conversion, then pdf2pic for PDF to PNG
   */
  async convertToImages(
    filePath: string,
    fileName: string,
  ): Promise<Result<VisualAsset[], DomainError>> {
    try {
      const ext = extname(fileName).toLowerCase();

      if (ext === ".pdf") {
        return this.convertPdfToImages(filePath, fileName);
      }

      if (ext === ".ppt" || ext === ".pptx") {
        return this.convertPptToImages(filePath, fileName);
      }

      return err(DomainError.invalidInput(`Unsupported document format: ${ext}`));
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Convert PDF to PNG images using pdf2pic (or similar)
   * This is a mock implementation - in production use pdf2pic or pdf-poppler
   */
  private async convertPdfToImages(
    _filePath: string,
    fileName: string,
  ): Promise<Result<VisualAsset[], DomainError>> {
    try {
      // In production, use pdf2pic:
      // const pdf2pic = require("pdf2pic");
      // const convert = pdf2pic.fromPath(filePath, { density: 200, format: "png" });
      // const results = await convert.bulk(-1);

      // Mock implementation for development
      const mockAssets: VisualAsset[] = [
        {
          page_num: 1,
          b2_uri: `s3://${this.config.processingPath.replace("processing/", "")}/${fileName}-page-1.png`,
        },
        {
          page_num: 2,
          b2_uri: `s3://${this.config.processingPath.replace("processing/", "")}/${fileName}-page-2.png`,
        },
      ];

      // Upload mock images to B2 (in production, upload actual rendered images)
      for (const asset of mockAssets) {
        const mockImageBuffer = Buffer.from(`MOCK PNG IMAGE FOR PAGE ${asset.page_num}`);
        const mockStream = Readable.from([mockImageBuffer]);

        const uri = asset.b2_uri;
        const key = uri.replace(/^s3:\/\/[^/]+\//, "");

        const uploadResult = await this.storage.uploadFile(key, mockStream);
        if (uploadResult.isErr()) {
          return err(uploadResult.error);
        }
      }

      return ok(mockAssets);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Convert PPT/PPTX to PNG images using LibreOffice headless
   * This is a mock implementation - in production use LibreOffice + pdf2pic
   */
  private async convertPptToImages(
    _filePath: string,
    fileName: string,
  ): Promise<Result<VisualAsset[], DomainError>> {
    try {
      // In production:
      // 1. Use LibreOffice headless to convert PPT to PDF
      //    libreoffice --headless --convert-to pdf --outdir /tmp file.pptx
      // 2. Then use pdf2pic to convert PDF to PNG

      // Mock implementation for development
      const mockAssets: VisualAsset[] = [
        {
          page_num: 1,
          b2_uri: `s3://${this.config.processingPath.replace("processing/", "")}/${fileName}-slide-1.png`,
        },
        {
          page_num: 2,
          b2_uri: `s3://${this.config.processingPath.replace("processing/", "")}/${fileName}-slide-2.png`,
        },
        {
          page_num: 3,
          b2_uri: `s3://${this.config.processingPath.replace("processing/", "")}/${fileName}-slide-3.png`,
        },
      ];

      // Upload mock images to B2
      for (const asset of mockAssets) {
        const mockImageBuffer = Buffer.from(`MOCK PNG IMAGE FOR SLIDE ${asset.page_num}`);
        const mockStream = Readable.from([mockImageBuffer]);

        const uri = asset.b2_uri;
        const key = uri.replace(/^s3:\/\/[^/]+\//, "");

        const uploadResult = await this.storage.uploadFile(key, mockStream);
        if (uploadResult.isErr()) {
          return err(uploadResult.error);
        }
      }

      return ok(mockAssets);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Save uploaded document file to temp directory
   */
  async saveUploadedFile(fileName: string, content: Buffer): Promise<Result<string, DomainError>> {
    try {
      const tempDir = join(tmpdir(), "plks-ingestion");
      await mkdir(tempDir, { recursive: true });

      const filePath = join(tempDir, fileName);
      await writeFile(filePath, content);

      return ok(filePath);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Clean up temp file
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
