// packages/shared/src/schemas/user-config.schema.ts
import { z } from "zod";

export const UserConfigPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  fusionLevel: z.enum(["strict_alignment", "high_level_summary"]),
  outputTemplates: z.array(z.enum(["knowledge_nodes", "flashcard_quiz"])).min(1),
  b2TargetDir: z.string().url().startsWith("s3://"),
});

export type UserConfigPayload = z.infer<typeof UserConfigPayloadSchema>;
