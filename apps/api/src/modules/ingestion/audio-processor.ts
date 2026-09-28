import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// apps/api/src/modules/ingestion/audio-processor.ts
import { Readable } from "node:stream";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { DomainError } from "../../core/errors/domain-errors.js";
import type { AudioSegment, IngestionConfig, TranscriptSegment } from "./types.js";

export class AudioProcessor {
  private readonly config: IngestionConfig;
  private readonly whisperApiKey: string;
  private readonly whisperApiUrl: string;

  constructor(config: IngestionConfig) {
    this.config = config;
    this.whisperApiKey = process.env["WHISPER_API_KEY"] ?? "";
    this.whisperApiUrl =
      process.env["WHISPER_API_URL"] ?? "https://api.openai.com/v1/audio/transcriptions";
  }

  /**
   * Split audio file into segments (max 10 minutes each for Whisper API)
   * Uses ffmpeg for actual splitting - here we simulate with metadata
   */
  async segmentAudio(filePath: string): Promise<Result<AudioSegment[], DomainError>> {
    try {
      // In production, use ffmpeg to split audio
      // For now, return a single segment covering the whole file
      // TODO: Implement actual ffmpeg-based segmentation
      const segment: AudioSegment = {
        filePath,
        startTime: 0,
        endTime: 600, // 10 minutes max
        duration: 600,
      };

      return ok([segment]);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Transcribe audio segment using Whisper API
   */
  async transcribeSegment(
    segment: AudioSegment,
  ): Promise<Result<TranscriptSegment[], DomainError>> {
    try {
      if (!this.whisperApiKey) {
        // Mock transcription for development/testing
        return ok([
          {
            start_time: this.formatTimestamp(segment.startTime),
            end_time: this.formatTimestamp(segment.endTime),
            text: `[Mock transcript for ${segment.filePath} from ${this.formatTimestamp(segment.startTime)} to ${this.formatTimestamp(segment.endTime)}]`,
          },
        ]);
      }

      // Read audio file
      const audioBuffer = await readFile(segment.filePath);

      // Create form data for Whisper API
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
      formData.append("file", blob, "segment.mp3");
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "segment");

      const response = await fetch(this.whisperApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.whisperApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as {
        segments?: Array<{ start: number; end: number; text: string }>;
      };

      const transcripts: TranscriptSegment[] = (result.segments ?? []).map((seg) => ({
        start_time: this.formatTimestamp(seg.start),
        end_time: this.formatTimestamp(seg.end),
        text: seg.text.trim(),
      }));

      return ok(transcripts);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  /**
   * Process full audio file: segment + transcribe
   */
  async processAudioFile(filePath: string): Promise<Result<TranscriptSegment[], DomainError>> {
    try {
      const segmentsResult = await this.segmentAudio(filePath);
      if (segmentsResult.isErr()) {
        return err(segmentsResult.error);
      }

      const allTranscripts: TranscriptSegment[] = [];

      for (const segment of segmentsResult.value) {
        const transcriptResult = await this.transcribeSegment(segment);
        if (transcriptResult.isErr()) {
          return err(transcriptResult.error);
        }
        allTranscripts.push(...transcriptResult.value);
      }

      return ok(allTranscripts);
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  }

  private formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Save uploaded audio file to temp directory
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
