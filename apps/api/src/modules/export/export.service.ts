import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IStructuredStore } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import type { QuizItemPayload } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
// apps/api/src/modules/export/export.service.ts
import { injectable } from "tsyringe";
import { DomainError } from "../../core/errors/domain-errors.js";

export interface ExportResult {
  conceptNodesExported: number;
  quizItemsExported: number;
  indexExported: boolean;
}

@injectable()
export class ExportService {
  constructor(
    private readonly storage: IStorageAdapter,
    private readonly structuredStore: IStructuredStore,
    private readonly graphWriter: IKnowledgeGraphWriter,
  ) {}

  /**
   * Export a course's knowledge graph to B2 (Obsidian Vault format)
   */
  async exportCourse(courseId: string): Promise<Result<ExportResult, DomainError>> {
    try {
      // 1. Get concept nodes from Supabase
      const conceptNodes = await this.structuredStore.getConceptNodesByCourse(courseId);

      // 2. Get quiz items from Supabase
      const quizItems = await this.structuredStore.getQuizItemsByCourse(courseId);

      if (conceptNodes.length === 0 && quizItems.length === 0) {
        return err(DomainError.notFound("CourseData", courseId));
      }

      // 3. Write each concept node to B2
      let exportedNodes = 0;
      const conceptNodePayloads: ConceptNodePayload[] = [];

      for (const node of conceptNodes) {
        const payload: ConceptNodePayload = {
          conceptId: node.conceptId,
          courseId: node.courseId,
          term: node.term,
          explanation: node.explanation,
          relatedTerms: node.relatedTerms,
          sourceEvidence: {
            transcriptRef: node.sourceEvidence?.transcriptRef ?? "",
            slideUri: node.sourceEvidence?.slideUri ?? "",
          },
        };

        const writeResult = await this.graphWriter.writeNode(payload);
        if (writeResult.isOk()) {
          exportedNodes++;
          conceptNodePayloads.push(payload);
        }
      }

      // 4. Write index (MOC)
      let indexExported = false;
      if (conceptNodePayloads.length > 0) {
        const indexResult = await this.graphWriter.writeIndex(courseId, conceptNodePayloads);
        if (indexResult.isOk()) {
          indexExported = true;
        }
      }

      // 5. Write quiz items
      let exportedQuizItems = 0;
      if (quizItems.length > 0) {
        const quizPayloads: QuizItemPayload[] = quizItems.map((q) => ({
          quizId: q.quizId,
          courseId: q.courseId,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          contextReference: q.contextReference,
        }));

        const quizResult = await this.graphWriter.writeQuiz(courseId, quizPayloads);
        if (quizResult.isOk()) {
          exportedQuizItems = quizPayloads.length;
        }
      }

      // 6. Mark as exported in Supabase
      const conceptNodeIds = conceptNodes.map((n) => n.conceptId);
      if (conceptNodeIds.length > 0) {
        const exportedUris = new Map<string, string>();
        for (const node of conceptNodes) {
          exportedUris.set(node.conceptId, `vault/${courseId}/concepts/${node.conceptId}.md`);
        }
        await this.structuredStore.markConceptNodesExported(conceptNodeIds, exportedUris);
      }

      const quizIds = quizItems.map((q) => q.quizId);
      if (quizIds.length > 0) {
        const quizUri = `vault/${courseId}/_quiz/${courseId}.json`;
        await this.structuredStore.markQuizItemsExported(quizIds, quizUri);
      }

      return ok({
        conceptNodesExported: exportedNodes,
        quizItemsExported: exportedQuizItems,
        indexExported,
      });
    } catch (cause) {
      return err(DomainError.exportFailed(cause));
    }
  }

  /**
   * Export all courses for a user
   */
  async exportAllCourses(userId: string): Promise<Result<ExportResult[], DomainError>> {
    try {
      const courses = await this.structuredStore.getCoursesByUser(userId);

      const results: ExportResult[] = [];

      for (const course of courses) {
        const exportResult = await this.exportCourse(course.id);
        if (exportResult.isOk()) {
          results.push(exportResult.value);
        }
      }

      return ok(results);
    } catch (cause) {
      return err(DomainError.exportFailed(cause));
    }
  }
}
