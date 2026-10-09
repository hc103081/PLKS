// apps/api/src/modules/ingestion/ingestion-pipeline.ts
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { RawAssetPayload } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { RawAsset } from "../../core/entities/raw-asset.js";
import { AudioProcessor } from "./audio-processor.js";
import { DocumentProcessor } from "./document-processor.js";
import { FileWatcher } from "./file-watcher.js";
import type {
  FileWatcherEvent,
  IngestionConfig,
  IngestionResult,
  TranscriptSegment,
  VisualAsset,
} from "./types.js";

export class IngestionPipeline {
  public readonly config: IngestionConfig;
  private readonly storage: IStorageAdapter;
  private readonly audioProcessor: AudioProcessor;
  private readonly documentProcessor: DocumentProcessor;
  private readonly fileWatcher: FileWatcher;

  constructor(config: IngestionConfig, storage: IStorageAdapter) {
    this.config = config;
    this.storage = storage;
    this.audioProcessor = new AudioProcessor(config);
    this.documentProcessor = new DocumentProcessor(config, storage);
    this.fileWatcher = new FileWatcher(config);
  }

  /**
   * Initialize and start the ingestion pipeline
   */
  async start(): Promise<Result<void, DomainError>> {
    const startResult = this.fileWatcher.start();
    if (startResult.isErr()) {
      return err(startResult.error);
    }

    // Register event handler for new files
    this.fileWatcher.onEvent(this.handleFileEvent.bind(this));

    return ok(undefined);
  }

  /**
   * Stop the ingestion pipeline
   */
  async stop(): Promise<Result<void, DomainError>> {
    this.fileWatcher.offEvent(this.handleFileEvent.bind(this));
    return this.fileWatcher.stop();
  }

  /**
   * Handle file watcher events
   */
  private async handleFileEvent(event: FileWatcherEvent): Promise<void> {
    if (event.type !== "add") {
      return; // Only process new files
    }

    try {
      await this.processFile(event.path, event.name);
    } catch (error) {
      console.error(`Failed to process file ${event.name}:`, error);
    }
  }

  /**
   * Process a single file (audio or document)
   */
  async processFile(
    filePath: string,
    fileName: string,
  ): Promise<Result<IngestionResult, DomainError>> {
    const sessionId = randomUUID();
    const courseId = this.extractCourseId(fileName);

    try {
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
      const isAudio = this.config.supportedAudioFormats.includes(ext);
      const isDoc = this.config.supportedDocFormats.includes(ext);

      let transcripts: TranscriptSegment[] = [];
      let visualAssets: VisualAsset[] = [];

      if (isAudio) {
        // Process audio file
        const transcriptResult = await this.audioProcessor.processAudioFile(filePath);
        if (transcriptResult.isErr()) {
          return err(transcriptResult.error);
        }
        transcripts = transcriptResult.value;

        // Clean up temp audio file
        await this.audioProcessor.cleanupFile(filePath);
      } else if (isDoc) {
        // Process document file
        const assetsResult = await this.documentProcessor.convertToImages(filePath, fileName);
        if (assetsResult.isErr()) {
          return err(assetsResult.error);
        }
        visualAssets = assetsResult.value;

        // Clean up temp document file
        await this.documentProcessor.cleanupFile(filePath);
      } else {
        return err(DomainError.invalidInput(`Unsupported file type: ${ext}`));
      }

      // Create RawAssetPayload
      const rawAsset = new RawAsset(sessionId, courseId, transcripts, visualAssets);

      // Save to processing directory
      const saveResult = await this.saveRawAsset(rawAsset.toPayload());
      if (saveResult.isErr()) {
        return err(saveResult.error);
      }

      return ok({
        sessionId,
        courseId,
        rawAsset: rawAsset.toPayload(),
      });
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Save RawAssetPayload to B2 processing directory
   */
  private async saveRawAsset(payload: RawAssetPayload): Promise<Result<boolean, DomainError>> {
    try {
      const path = `${this.config.processingPath}${payload.sessionId}.json`;
      const json = JSON.stringify(payload, null, 2);
      const stream = Readable.from([json]);

      const result = await this.storage.uploadFile(path, stream);

      if (result.isErr()) {
        return err(DomainError.storageUploadFailed(result.error));
      }

      return ok(true);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Extract course ID from filename (e.g., "CS101_lecture1.mp3" -> "CS101")
   */
  private extractCourseId(fileName: string): string {
    // Try to extract course ID from filename
    // Format: {courseId}_{rest}.ext or {courseId}-{rest}.ext
    const match = fileName.match(/^([A-Za-z0-9_-]+)[_-]/);
    if (match?.[1]) {
      return match[1];
    }
    // Fallback: use filename without extension
    const parts = fileName.split(".");
    return parts[0] ?? fileName;
  }

  /**
   * Manually trigger processing of a file (for API endpoint)
   */
  async processFileManually(
    fileName: string,
    content: Buffer,
  ): Promise<Result<IngestionResult, DomainError>> {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const isAudio = this.config.supportedAudioFormats.includes(ext);
    const isDoc = this.config.supportedDocFormats.includes(ext);

    if (!isAudio && !isDoc) {
      return err(DomainError.invalidInput(`Unsupported file type: ${ext}`));
    }

    // Save to temp
    let filePath: string;
    if (isAudio) {
      const saveResult = await this.audioProcessor.saveUploadedFile(fileName, content);
      if (saveResult.isErr()) return err(saveResult.error);
      filePath = saveResult.value;
    } else {
      const saveResult = await this.documentProcessor.saveUploadedFile(fileName, content);
      if (saveResult.isErr()) return err(saveResult.error);
      filePath = saveResult.value;
    }

    return this.processFile(filePath, fileName);
  }
}
