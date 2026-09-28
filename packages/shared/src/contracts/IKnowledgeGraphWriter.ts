import type { Result } from "neverthrow";
import type { DomainError } from "../errors/domain-error.js";
// packages/shared/src/contracts/IKnowledgeGraphWriter.ts
import type { ConceptNodePayload } from "../schemas/concept-node.schema.js";
import type { QuizItemPayload } from "../schemas/quiz-item.schema.js";

export interface IKnowledgeGraphWriter {
  /** 將單一概念節點轉為 Markdown 並寫入 B2 */
  writeNode(node: ConceptNodePayload): Promise<Result<boolean, DomainError>>;

  /** 生成課程主控台筆記 (MOC)，包含雙向連結索引 */
  writeIndex(courseId: string, nodes: ConceptNodePayload[]): Promise<Result<boolean, DomainError>>;

  /** 寫入測驗題目至 _quiz/{courseId}.json */
  writeQuiz(courseId: string, quizItems: QuizItemPayload[]): Promise<Result<boolean, DomainError>>;
}
