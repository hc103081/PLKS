// packages/shared/src/contracts/IAIReasoningGateway.ts
export interface IAIReasoningGateway {
  /**
   * 多模態推理
   * @param systemPrompt 系統提示詞 (含 JSON Schema 指令)
   * @param textPayload 使用者文字內容
   * @param imageUrls 圖片 Presigned URL 陣列
   * @returns 解析後的 JSON 物件
   */
  multimodalInfer(
    systemPrompt: string,
    textPayload: string,
    imageUrls: string[]
  ): Promise<unknown>;
}