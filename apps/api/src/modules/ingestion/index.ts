// apps/api/src/modules/ingestion/index.ts
export { IngestionPipeline } from "./ingestion-pipeline.js";
export { AudioProcessor } from "./audio-processor.js";
export { DocumentProcessor } from "./document-processor.js";
export { FileWatcher } from "./file-watcher.js";
export type {
  IngestionConfig,
  AudioSegment,
  TranscriptSegment,
  VisualAsset,
  IngestionResult,
  FileWatcherEvent,
} from "./types.js";
