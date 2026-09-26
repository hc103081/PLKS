// apps/api/src/core/entities/raw-asset.ts
import type { RawAssetPayload } from "@plks/shared/schemas";

export class RawAsset {
  constructor(
    public readonly sessionId: string,
    public readonly courseId: string,
    public readonly transcripts: ReadonlyArray<{
      start_time: string;
      end_time: string;
      text: string;
    }>,
    public readonly visualAssets: ReadonlyArray<{
      page_num: number;
      b2_uri: string;
    }>,
  ) {}

  static fromPayload(payload: RawAssetPayload): RawAsset {
    return new RawAsset(
      payload.sessionId,
      payload.courseId,
      [...payload.transcripts],
      [...payload.visualAssets],
    );
  }

  toPayload(): RawAssetPayload {
    return {
      sessionId: this.sessionId,
      courseId: this.courseId,
      transcripts: [...this.transcripts],
      visualAssets: [...this.visualAssets],
    };
  }

  getFullTranscript(): string {
    return this.transcripts.map((t) => t.text).join(" ");
  }

  getTranscriptByTimeRange(start: string, end: string): string {
    return this.transcripts
      .filter((t) => t.start_time >= start && t.end_time <= end)
      .map((t) => t.text)
      .join(" ");
  }
}
