// packages/shared/src/schemas/quiz-item.schema.ts
import { z } from 'zod';

export const QuizItemPayloadSchema = z.object({
  quizId: z.string().uuid(),
  courseId: z.string().min(1),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  contextReference: z.string().uuid(),
});

export type QuizItemPayload = z.infer<typeof QuizItemPayloadSchema>;