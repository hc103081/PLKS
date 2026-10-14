// packages/shared/src/contracts/IAIReasoningGateway.ts
import type { Result } from "neverthrow";
import type { DomainError } from "../errors/domain-error.js";

export interface IAIReasoningGateway {
  /**
   * 多模態推理 (非串流)
   * @param systemPrompt 系統提示詞 (含 JSON Schema 指令)
   * @param textPayload 使用者文字內容
   * @param imageUrls 圖片 Presigned URL 陣列
   * @returns 解析後的 JSON 物件
   */
  multimodalInfer(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[],
  ): Promise<Result<unknown, DomainError>>;

  /**
   * 多模態推理 (串流)
   * @param systemPrompt 系統提示詞
   * @param textPayload 使用者文字內容
   * @param imageUrls 圖片 Presigned URL 陣列
   * @returns 非同步產生器，產出內容片段
   */
  multimodalInferStream(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[],
  ): AsyncIterable<{ content?: string }>;
}
