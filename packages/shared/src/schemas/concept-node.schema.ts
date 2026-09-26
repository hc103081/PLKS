// packages/shared/src/schemas/concept-node.schema.ts
import { z } from 'zod';

export const ConceptNodePayloadSchema = z.object({
  conceptId: z.string().uuid(),
  courseId: z.string().min(1),
  term: z.string().min(1),
  explanation: z.string().min(1),
  relatedTerms: z.array(z.string()).default([]),
  sourceEvidence: z.object({
    transcriptRef: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    slideUri: z.string().url(),
  }),
});

export type ConceptNodePayload = z.infer<typeof ConceptNodePayloadSchema>;