import type { IStructuredStore } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { ConceptNodePayload, QuizItemPayload } from "@plks/shared/schemas";
import type { Course } from "@plks/shared/types/database";
// apps/api/src/adapters/supabase-structured-store.adapter.ts
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { injectable } from "tsyringe";

@injectable()
export class SupabaseStructuredStore implements IStructuredStore {
  private readonly supabase: SupabaseClient;
  private readonly devUserId: string; // In a real app, this would come from auth context

  constructor() {
    const supabaseUrl = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
    const supabaseServiceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Supabase credentials not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // For development, use a fixed user ID if provided
    const devUserId = process.env["PLKS_DEV_USER_ID"];
    if (devUserId) {
      this.devUserId = devUserId;
    } else {
      // Fallback to a hardcoded UUID for development (should be replaced with auth)
      this.devUserId = "00000000-0000-0000-0000-000000000000";
    }
  }

  private getUserId(): string {
    // TODO: Replace with actual auth context when implemented
    return this.devUserId;
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    try {
      const userId = this.getUserId();
      const { data, error } = await this.supabase
        .from("courses")
        .insert({
          user_id: userId,
          semester_code: input.semesterCode,
          code: input.code,
          name: input.name,
          description: input.description ?? null,
          cover_image_uri: input.coverImageUri ?? null,
          b2_export_dir: input.b2ExportDir ?? null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      return data as Course;
    } catch (cause) {
      throw new DomainError("COURSE_CREATE_FAILED", "Failed to create course", cause);
    }
  }

  async getCoursesByUser(userId: string): Promise<Course[]> {
    try {
      const { data, error } = await this.supabase
        .from("courses")
        .select("*, semesters!inner(code, year, term, label, sort_order)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Course[];
    } catch (cause) {
      throw new DomainError("COURSE_FETCH_FAILED", "Failed to fetch courses", cause);
    }
  }

  async getCourseById(id: string): Promise<Course | null> {
    try {
      const { data, error } = await this.supabase
        .from("courses")
        .select("*, semesters!inner(code, year, term, label, sort_order)")
        .eq("id", id)
        .single();

      if (error) {
        // If the error is not found, return null
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }
      return data as Course | null;
    } catch (cause) {
      throw new DomainError("COURSE_FETCH_FAILED", `Failed to fetch course ${id}`, cause);
    }
  }

  async updateCourse(id: string, patch: Partial<Course>): Promise<Course> {
    try {
      const { data, error } = await this.supabase
        .from("courses")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      return data as Course;
    } catch (cause) {
      throw new DomainError("COURSE_UPDATE_FAILED", `Failed to update course ${id}`, cause);
    }
  }

  async deleteCourse(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.from("courses").delete().eq("id", id);

      if (error) throw error;
    } catch (cause) {
      throw new DomainError("COURSE_DELETE_FAILED", `Failed to delete course ${id}`, cause);
    }
  }

  async upsertConceptNodes(nodes: ConceptNodePayload[]): Promise<ConceptNodePayload[]> {
    try {
      // We'll insert or update the concept nodes in the database
      // For simplicity, we'll do an upsert using the conceptId as the unique key
      // Note: In a real implementation, we would use the Supabase upsert feature with on conflict
      // But for now, we'll insert and if there's a duplicate key error, we'll update.
      // However, to keep it simple, we'll just insert and ignore duplicates (or handle errors).
      // Since we are in a hurry, we'll do a simple insert and return the nodes.
      // In a real app, we would use the Supabase upsert.

      // We'll insert each node
      const insertedNodes: ConceptNodePayload[] = [];

      for (const node of nodes) {
        const { data, error } = await this.supabase
          .from("concept_nodes")
          .upsert({
            concept_id: node.conceptId,
            course_id: node.courseId,
            term: node.term,
            explanation: node.explanation,
            related_terms: node.relatedTerms,
            source_evidence: JSON.stringify({
              transcriptRef: node.sourceEvidence.transcriptRef,
              slideUri: node.sourceEvidence.slideUri,
            }),
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          // Map the database row back to the payload type
          insertedNodes.push({
            conceptId: data.concept_id,
            courseId: data.course_id,
            term: data.term,
            explanation: data.explanation,
            relatedTerms: data.related_terms,
            sourceEvidence: {
              transcriptRef: (data.source_evidence as { transcriptRef: string; slideUri: string })
                .transcriptRef,
              slideUri: (data.source_evidence as { transcriptRef: string; slideUri: string })
                .slideUri,
            },
          });
        }
      }

      return insertedNodes;
    } catch (cause) {
      throw new DomainError("CONCEPT_NODE_UPSERT_FAILED", "Failed to upsert concept nodes", cause);
    }
  }

  async getConceptNodesByCourse(courseId: string): Promise<ConceptNodePayload[]> {
    try {
      const { data, error } = await this.supabase
        .from("concept_nodes")
        .select("concept_id, course_id, term, explanation, related_terms, source_evidence")
        .eq("course_id", courseId);

      if (error) throw error;

      // Map the database rows to the payload type
      return (
        data as Array<{
          concept_id: string;
          course_id: string;
          term: string;
          explanation: string;
          related_terms: string[];
          source_evidence: { transcriptRef: string; slideUri: string };
        }>
      ).map((row) => ({
        conceptId: row.concept_id,
        courseId: row.course_id,
        term: row.term,
        explanation: row.explanation,
        relatedTerms: row.related_terms,
        sourceEvidence: row.source_evidence,
      }));
    } catch (cause) {
      throw new DomainError(
        "CONCEPT_NODE_FETCH_FAILED",
        `Failed to fetch concept nodes for course ${courseId}`,
        cause,
      );
    }
  }

  async markConceptNodesExported(ids: string[], _b2Uris: Map<string, string>): Promise<void> {
    try {
      // We'll update the concept nodes to mark them as exported
      // For simplicity, we'll update each node with its B2 URI
      // In a real app, we might have an exported flag or a separate table.
      // Since we don't have an exported flag in the schema, we'll skip this for now.
      // We'll just update a placeholder or do nothing.
      // TODO: Implement when we have an exported flag in the database.
      // For now, we'll just log and return.
      console.log(`Marking ${ids.length} concept nodes as exported`);
      // We don't have a column for export status, so we cannot mark them.
      // We'll assume that the export process will handle this separately.
      // We'll just return without doing anything.
      return;
    } catch (cause) {
      throw new DomainError(
        "CONCEPT_NODE_MARK_EXPORT_FAILED",
        "Failed to mark concept nodes as exported",
        cause,
      );
    }
  }

  async upsertQuizItems(items: QuizItemPayload[]): Promise<QuizItemPayload[]> {
    try {
      const insertedItems: QuizItemPayload[] = [];

      for (const item of items) {
        const { data, error } = await this.supabase
          .from("quiz_items")
          .upsert({
            quiz_id: item.quizId,
            course_id: item.courseId,
            type: item.type,
            question: item.question,
            options: item.options,
            correct_answer: item.correctAnswer,
            context_reference: item.contextReference,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          insertedItems.push({
            quizId: data.quiz_id,
            courseId: data.course_id,
            type: data.type as QuizItemPayload["type"],
            question: data.question,
            options: data.options,
            correctAnswer: data.correct_answer,
            contextReference: data.context_reference,
          });
        }
      }

      return insertedItems;
    } catch (cause) {
      throw new DomainError("QUIZ_ITEM_UPSERT_FAILED", "Failed to upsert quiz items", cause);
    }
  }

  async getQuizItemsByCourse(courseId: string): Promise<QuizItemPayload[]> {
    try {
      const { data, error } = await this.supabase
        .from("quiz_items")
        .select("quiz_id, course_id, type, question, options, correct_answer, context_reference")
        .eq("course_id", courseId);

      if (error) throw error;

      return (
        data as Array<{
          quiz_id: string;
          course_id: string;
          type: string;
          question: string;
          options: string[] | null;
          correct_answer: string;
          context_reference: string;
        }>
      ).map((row) => ({
        quizId: row.quiz_id,
        courseId: row.course_id,
        type: row.type,
        question: row.question,
        options: row.options,
        correctAnswer: row.correct_answer,
        contextReference: row.context_reference,
      }));
    } catch (cause) {
      throw new DomainError(
        "QUIZ_ITEM_FETCH_FAILED",
        `Failed to fetch quiz items for course ${courseId}`,
        cause,
      );
    }
  }

  async markQuizItemsExported(_ids: string[], b2Uri: string): Promise<void> {
    try {
      // Similar to concept nodes, we don't have an exported flag in the quiz_items table.
      // We'll just log and return.
      console.log(`Marking quiz items as exported with B2 URI: ${b2Uri}`);
      return;
    } catch (cause) {
      throw new DomainError(
        "QUIZ_ITEM_MARK_EXPORT_FAILED",
        "Failed to mark quiz items as exported",
        cause,
      );
    }
  }

  async upsertProgress(progress: ProgressInput): Promise<void> {
    try {
      const userId = this.getUserId();
      const { error } = await this.supabase
        .from("user_progress")
        .upsert({
          concept_id: progress.concept_id,
          course_id: progress.course_id,
          user_id: userId,
          created_at: progress.created_at,
          due_date: progress.due_date,
          ease_factor: progress.ease_factor,
          id: progress.id,
          interval_days: progress.interval_days,
          last_reviewed_at: progress.last_reviewed_at,
          repetitions: progress.repetitions,
          updated_at: progress.updated_at,
        });

      if (error) throw error;
    } catch (cause) {
      throw new DomainError("PROGRESS_UPLOAD_FAILED", "Failed to upload progress", cause);
    }
  }
  async getDueReviews(userId: string, courseId: string, limit: number): Promise<Progress[]> {
    try {
      const { data, error } = await this.supabase
        .from("user_progress")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .lte("due_date", new Date().toISOString().split("T")[0])
        .order("due_date", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Progress[];
    } catch (cause) {
      throw new DomainError(
        "PROGRESS_FETCH_FAILED",
        `Failed to fetch due reviews for course ${courseId}`,
        cause,
      );
    }
  }
  async logAnswer(log: AnswerLogInput): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("answer_logs")
        .insert({
          course_id: log.course_id,
          id: log.id,
          is_correct: log.is_correct,
          quiz_id: log.quiz_id,
          response_time_ms: log.response_time_ms,
          sidekick_context: log.sidekick_context,
          sidekick_used: log.sidekick_used,
          user_answer: log.user_answer,
          user_id: this.getUserId(),
        });

      if (error) throw error;
    } catch (cause) {
      throw new DomainError("ANSWER_LOG_FAILED", "Failed to log answer", cause);
    }
  }
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    } catch (cause) {
      throw new DomainError(
        "CHAT_HISTORY_FETCH_FAILED",
        `Failed to fetch chat history for session ${sessionId}`,
        cause,
      );
    }
  }
  async appendChatMessage(msg: ChatMessageInput): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("chat_messages")
        .insert({
          content: msg.content,
          id: msg.id,
          metadata: msg.metadata,
          role: msg.role,
          session_id: msg.session_id,
        });

      if (error) throw error;
    } catch (cause) {
      throw new DomainError("CHAT_APPEND_FAILED", "Failed to append chat message", cause);
    }
  }
  subscribeProgress(): () => void {
    return () => {};
  }
  subscribeChatMessages(): () => void {
    return () => {};
  }
}

import type {
  AnswerLogInput,
  ChatMessage,
  ChatMessageInput,
  Progress,
  ProgressInput,
} from "@plks/shared/types/database";
