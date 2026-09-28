// apps/api/src/modules/ingestion/types.ts
import type { RawAssetPayload } from "@plks/shared/schemas";

export interface IngestionConfig {
  inboxPath: string;
  processingPath: string;
  pollIntervalMs: number;
  maxFileSizeBytes: number;
  supportedAudioFormats: string[];
  supportedDocFormats: string[];
}

export interface AudioSegment {
  filePath: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TranscriptSegment {
  start_time: string;
  end_time: string;
  text: string;
}

export interface VisualAsset {
  page_num: number;
  b2_uri: string;
}

export interface IngestionResult {
  sessionId: string;
  courseId: string;
  rawAsset: RawAssetPayload;
}

export interface FileWatcherEvent {
  type: "add" | "change" | "unlink";
  path: string;
  name: string;
}
