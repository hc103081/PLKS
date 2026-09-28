// packages/shared/src/schemas/ai-extraction-result.schema.ts
import { z } from "zod";
import { ConceptNodePayloadSchema } from "./concept-node.schema.js";
import { QuizItemPayloadSchema } from "./quiz-item.schema.js";

export const AiExtractionResultSchema = z.object({
  conceptNodes: z.array(ConceptNodePayloadSchema).default([]),
  quizItems: z.array(QuizItemPayloadSchema).default([]),
});

export type AiExtractionResult = z.infer<typeof AiExtractionResultSchema>;
