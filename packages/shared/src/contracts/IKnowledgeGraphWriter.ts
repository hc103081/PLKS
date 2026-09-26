// packages/shared/src/contracts/IKnowledgeGraphWriter.ts
import type { ConceptNodePayload } from "../schemas/concept-node.schema.js";

export interface IKnowledgeGraphWriter {
  /** 將單一概念節點轉為 Markdown 並寫入 B2 */
  writeNode(node: ConceptNodePayload): Promise<boolean>;

  /** 生成課程主控台筆記 (MOC)，包含雙向連結索引 */
  writeIndex(courseId: string, nodes: ConceptNodePayload[]): Promise<boolean>;
}
