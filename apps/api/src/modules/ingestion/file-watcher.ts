// apps/api/src/modules/ingestion/file-watcher.ts
import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { DomainError } from "../../core/errors/domain-errors.js";
import type { FileWatcherEvent, IngestionConfig } from "./types.js";

export class FileWatcher {
  private readonly config: IngestionConfig;
  private watcher: FSWatcher | null = null;
  private readonly eventHandlers: Array<(event: FileWatcherEvent) => void> = [];
  private isRunning = false;

  constructor(config: IngestionConfig) {
    this.config = config;
  }

  /**
   * Start watching the inbox directory
   */
  start(): Result<void, DomainError> {
    if (this.isRunning) {
      return ok(undefined);
    }

    try {
      const inboxDir = join(process.cwd(), this.config.inboxPath);

      this.watcher = watch(inboxDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const ext = filename.split(".").pop()?.toLowerCase();
        const isSupportedAudio = this.config.supportedAudioFormats.includes(ext ?? "");
        const isSupportedDoc = this.config.supportedDocFormats.includes(ext ?? "");

        if (!isSupportedAudio && !isSupportedDoc) {
          return; // Ignore unsupported files
        }

        const event: FileWatcherEvent = {
          type: eventType === "rename" ? "add" : (eventType as FileWatcherEvent["type"]),
          path: join(inboxDir, filename),
          name: filename,
        };

        this.notifyHandlers(event);
      });

      this.watcher.on("error", (error) => {
        console.error("File watcher error:", error);
      });

      this.isRunning = true;
      return ok(undefined);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Stop watching
   */
  stop(): Result<void, DomainError> {
    if (!this.isRunning || !this.watcher) {
      return ok(undefined);
    }

    try {
      this.watcher.close();
      this.watcher = null;
      this.isRunning = false;
      return ok(undefined);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: FileWatcherEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  offEvent(handler: (event: FileWatcherEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private notifyHandlers(event: FileWatcherEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Error in file watcher handler:", error);
      }
    }
  }

  get running(): boolean {
    return this.isRunning;
  }
}
