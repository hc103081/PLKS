import { Readable } from "node:stream";
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
      // 1. Get course info to determine export directory
      const course = await this.structuredStore.getCourseById(courseId);
      if (!course) {
        return err(DomainError.notFound("Course", courseId));
      }
      const exportDir = course.b2_export_dir;
      if (!exportDir) {
        return err(DomainError.failedPrecondition("Course missing B2 export directory"));
      }

      // 2. Get concept nodes from Supabase
      const conceptNodes = await this.structuredStore.getConceptNodesByCourse(courseId);

      // 3. Get quiz items from Supabase
      const quizItems = await this.structuredStore.getQuizItemsByCourse(courseId);

      if (conceptNodes.length === 0 && quizItems.length === 0) {
        return err(DomainError.notFound("CourseData", courseId));
      }

      // 4. Upload each concept node to B2
      let exportedNodes = 0;
      const conceptNodePayloads: ConceptNodePayload[] = [];
      const conceptNodeUris = new Map<string, string>();

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

        const writeNodeResult = await this.graphWriter.writeNode(payload);
        if (writeNodeResult.isErr()) {
          return err(writeNodeResult.error);
        }
        const markdownContent = writeNodeResult.value;
        const filePath = `${exportDir}/nodes/${node.conceptId}.md`;
        const uploadResult = await this.storage.uploadFile(
          filePath,
          Readable.from(markdownContent),
        );
        if (uploadResult.isErr()) {
          return err(uploadResult.error);
        }

        exportedNodes++;
        conceptNodePayloads.push(payload);
        conceptNodeUris.set(node.conceptId, uploadResult.value);
      }

      // 5. Upload index (MOC)
      let indexExported = false;
      let indexUri: string | undefined;
      if (conceptNodePayloads.length > 0) {
        const writeIndexResult = await this.graphWriter.writeIndex(courseId, conceptNodePayloads);
        if (writeIndexResult.isErr()) {
          return err(writeIndexResult.error);
        }
        const indexContent = writeIndexResult.value;
        const indexFilePath = `${exportDir}/${courseId}-index.md`;
        const indexUploadResult = await this.storage.uploadFile(
          indexFilePath,
          Readable.from(indexContent),
        );
        if (indexUploadResult.isErr()) {
          return err(indexUploadResult.error);
        }
        indexExported = true;
        indexUri = indexUploadResult.value;
      }

      // 6. Upload quiz items
      let exportedQuizItems = 0;
      let quizUri: string | undefined;
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

        const writeQuizResult = await this.graphWriter.writeQuiz(courseId, quizPayloads);
        if (writeQuizResult.isErr()) {
          return err(writeQuizResult.error);
        }
        const quizJsonContent = writeQuizResult.value;
        const quizFilePath = `${exportDir}/${courseId}-quiz.json`;
        const quizUploadResult = await this.storage.uploadFile(
          quizFilePath,
          Readable.from(quizJsonContent),
        );
        if (quizUploadResult.isErr()) {
          return err(quizUploadResult.error);
        }

        exportedQuizItems = quizPayloads.length;
        quizUri = quizUploadResult.value;
      }

      // 7. Mark as exported in Supabase
      const conceptNodeIds = conceptNodes.map((n) => n.conceptId);
      if (conceptNodeIds.length > 0) {
        await this.structuredStore.markConceptNodesExported(conceptNodeIds, conceptNodeUris);
      }

      const quizIds = quizItems.map((q) => q.quizId);
      if (quizIds.length > 0 && quizUri !== undefined) {
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
