// packages/shared/src/schemas/raw-asset.schema.ts
import { z } from 'zod';

export const RawAssetPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  courseId: z.string().min(1),
  transcripts: z.array(
    z.object({
      start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      text: z.string().min(1),
    })
  ),
  visualAssets: z.array(
    z.object({
      page_num: z.number().int().positive(),
      b2_uri: z.string().url(),
    })
  ),
});

export type RawAssetPayload = z.infer<typeof RawAssetPayloadSchema>;