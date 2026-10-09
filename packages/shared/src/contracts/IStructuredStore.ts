// packages/shared/src/contracts/IStructuredStore.ts
import { z } from "zod";
import type { ConceptNodePayload, QuizItemPayload } from "../schemas";
import type { Course } from "../types/database";
import type {
  AnswerLogInput,
  ChatMessage,
  ChatMessageInput,
  Progress,
  ProgressInput,
} from "../types/database";

export const CreateCourseInputSchema = z.object({
  userId: z.string().uuid(),
  semester: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  credits: z.number().int().positive(),
  type: z.enum(["required", "elective", "general"]),
  instructor: z.string().optional(),
  location: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

export interface IStructuredStore {
  // Courses
  createCourse(input: CreateCourseInput): Promise<Course>;
  getCoursesByUser(userId: string): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  updateCourse(id: string, patch: Partial<Course>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;

  // Concept Nodes
  upsertConceptNodes(nodes: ConceptNodePayload[]): Promise<ConceptNodePayload[]>;
  getConceptNodesByCourse(courseId: string): Promise<ConceptNodePayload[]>;
  markConceptNodesExported(ids: string[], b2Uris: Map<string, string>): Promise<void>;

  // Quiz Items
  upsertQuizItems(items: QuizItemPayload[]): Promise<QuizItemPayload[]>;
  getQuizItemsByCourse(courseId: string): Promise<QuizItemPayload[]>;
  markQuizItemsExported(ids: string[], b2Uri: string): Promise<void>;

  // Progress / Logs / Chat
  upsertProgress(progress: ProgressInput): Promise<void>;
  getDueReviews(userId: string, courseId: string, limit: number): Promise<Progress[]>;
  logAnswer(log: AnswerLogInput): Promise<void>;
  getChatHistory(sessionId: string): Promise<ChatMessage[]>;
  appendChatMessage(msg: ChatMessageInput): Promise<void>;

  // Realtime 訂閱封裝
  subscribeProgress(userId: string, callback: (payload: Progress) => void): () => void;
  subscribeChatMessages(sessionId: string, callback: (payload: ChatMessage) => void): () => void;
}
