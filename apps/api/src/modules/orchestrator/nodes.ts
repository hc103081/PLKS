// apps/api/src/modules/orchestrator/nodes.ts
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { RawAssetPayload } from "@plks/shared/schemas";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import { type AiExtractionResult, AiExtractionResultSchema } from "@plks/shared/schemas";
import { type Result, err, ok } from "neverthrow";
import { RawAsset } from "../../core/entities/raw-asset.js";
import { DomainError } from "../../core/errors/domain-errors.js";

export interface PipelineContext {
  sessionId: string;
  courseId: string;
  rawAsset?: RawAssetPayload;
  signedUrls?: string[];
  systemPrompt?: string;
  textPayload?: string;
  imageUrls?: string[];
  aiResult?: AiExtractionResult;
  validatedResult?: AiExtractionResult;
}

export interface PipelineNodes {
  A(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
  B(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
  C(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
  D(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
  E(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
  F(ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>>;
}

const PROCESSING_PREFIX = "processing/";

export function createPipelineNodes(
  storage: IStorageAdapter,
  graphWriter: IKnowledgeGraphWriter,
  aiGateway: IAIReasoningGateway,
): PipelineNodes {
  // Node A: Load Data
  const nodeA = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      const path = `${PROCESSING_PREFIX}${ctx.sessionId}.json`;
      const result = await storage.downloadFile(path);

      if (result.isErr()) {
        return err(result.error);
      }

      const stream = result.value;
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      }
      const content = chunks.join("");
      const rawAsset = RawAsset.fromPayload(JSON.parse(content));

      return ok({ ...ctx, rawAsset: rawAsset.toPayload() });
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  };

  // Node B: Sign URLs (generate 15-min presigned URLs for visual assets)
  const nodeB = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      if (!ctx.rawAsset || !ctx.rawAsset.visualAssets.length) {
        return ok({ ...ctx, signedUrls: [] });
      }

      const signedUrls: string[] = [];
      const expirySeconds = 15 * 60; // 15 minutes

      for (const asset of ctx.rawAsset.visualAssets) {
        const urlResult = await storage.generatePresignedUrl(asset.b2_uri, expirySeconds);
        if (urlResult.isErr()) {
          return err(urlResult.error);
        }
        signedUrls.push(urlResult.value);
      }

      return ok({ ...ctx, signedUrls });
    } catch (cause) {
      return err(DomainError.presignedUrlFailed(cause));
    }
  };

  // Node C: Assemble Prompt
  const nodeC = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      if (!ctx.rawAsset) {
        return err(DomainError.invalidInput("RawAsset not loaded"));
      }

      // Load system prompt from file (knowledge extraction)
      const systemPrompt = `你是一位專業的知識工程師，任務是從多模態輸入（逐字稿 + 投影片圖片）中提取結構化知識節點。

## 輸出格式要求
嚴格輸出 **單一 JSON 物件**，符合以下 JSON Schema（不得包含任何額外文字、Markdown 代碼塊或解釋）：

\`\`\`json
{
  "\$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "conceptNodes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "conceptId": { "type": "string", "format": "uuid" },
          "courseId": { "type": "string" },
          "term": { "type": "string", "minLength": 1 },
          "explanation": { "type": "string", "minLength": 1 },
          "relatedTerms": { "type": "array", "items": { "type": "string" } },
          "sourceEvidence": {
            "type": "object",
            "properties": {
              "transcriptRef": { "type": "string" },
              "slideUri": { "type": "string", "format": "uri" }
            },
            "required": ["transcriptRef", "slideUri"]
          }
        },
        "required": ["conceptId", "courseId", "term", "explanation", "relatedTerms", "sourceEvidence"]
      }
    },
    "quizItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "quizId": { "type": "string", "format": "uuid" },
          "courseId": { "type": "string" },
          "type": { "type": "string", "enum": ["multiple_choice", "true_false", "short_answer"] },
          "question": { "type": "string", "minLength": 1 },
          "options": { "type": "array", "items": { "type": "string" } },
          "correctAnswer": { "type": "string", "minLength": 1 },
          "contextReference": { "type": "string", "format": "uuid" }
        },
        "required": ["quizId", "courseId", "type", "question", "correctAnswer", "contextReference"]
      }
    }
  },
  "required": ["conceptNodes", "quizItems"]
}
\`\`\`

## 處理指令
1. **概念節點 (conceptNodes)**：
   - 從逐字稿中識別關鍵術語、定義、核心概念
   - 結合投影片圖片中的視覺資訊（圖表、公式、關鍵字）
   - 每個節點必須包含：唯一 UUID、課程 ID、術語名稱、詳細解釋、相關術語陣列
   - sourceEvidence 必須引用：逐字稿時間軸參考（如 "00:15:30-00:16:45"）與對應投影片圖片 URI

2. **測驗題目 (quizItems)**：
   - 基於概念節點生成 3-5 題測驗
   - 類型：multiple_choice（4 選項）、true_false、short_answer
   - 必須包含正確答案與對應的 contextReference (conceptNode 的 conceptId)

3. **品質要求**：
   - 術語定義準確、專業、可獨立理解
   - 相關術語需真正相關（同義詞、上下位概念、因果關係）
   - 避免幻覺：所有內容必須可追溯至輸入資料
   - 若資訊不足以生成完整節點，請跳過該概念

## 輸入資料
- **逐字稿**：含時間碼的文字內容
- **投影片圖片**：Presigned URL 陣列，按頁碼順序排列`;

      // Build text payload from transcripts
      const fullTranscript = ctx.rawAsset.transcripts
        .map((t) => `[${t.start_time}-${t.end_time}] ${t.text}`)
        .join("\n");

      // Build image references
      const imageUrls = ctx.signedUrls ?? [];

      return ok({
        ...ctx,
        systemPrompt,
        textPayload: fullTranscript,
        imageUrls,
      });
    } catch (cause) {
      return err(DomainError.ingestionFailed(cause));
    }
  };

  // Node D: AI Execution
  const nodeD = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      if (!ctx.systemPrompt || !ctx.textPayload) {
        return err(DomainError.invalidInput("Prompt not assembled"));
      }

      const imageUrls = ctx.imageUrls ?? [];
      const aiResult = await aiGateway.multimodalInfer(
        ctx.systemPrompt,
        ctx.textPayload,
        imageUrls,
      );

      if (aiResult.isErr()) {
        return err(aiResult.error);
      }

      return ok({ ...ctx, aiResult: aiResult.value as AiExtractionResult });
    } catch (cause) {
      return err(DomainError.aiInferenceFailed(cause));
    }
  };

  // Node E: Validate Output
  const nodeE = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      if (!ctx.aiResult) {
        return err(DomainError.invalidInput("AI result not available"));
      }

      const parseResult = AiExtractionResultSchema.safeParse(ctx.aiResult);

      if (!parseResult.success) {
        return err(DomainError.aiValidationFailed(parseResult.error));
      }

      return ok({ ...ctx, validatedResult: parseResult.data });
    } catch (cause) {
      return err(DomainError.aiValidationFailed(cause));
    }
  };

  // Node F: Persist
  const nodeF = async (ctx: PipelineContext): Promise<Result<PipelineContext, DomainError>> => {
    try {
      if (!ctx.validatedResult) {
        return err(DomainError.invalidInput("Validated result not available"));
      }

      // Write concept nodes
      for (const node of ctx.validatedResult.conceptNodes) {
        const writeResult = await graphWriter.writeNode(node);
        if (writeResult.isErr()) {
          return err(writeResult.error);
        }
      }

      // Write index (MOC)
      const indexResult = await graphWriter.writeIndex(
        ctx.courseId,
        ctx.validatedResult.conceptNodes,
      );
      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      // Write quiz items to _quiz/{courseId}.json
      if (ctx.validatedResult.quizItems.length > 0) {
        const quizResult = await graphWriter.writeQuiz(ctx.courseId, ctx.validatedResult.quizItems);
        if (quizResult.isErr()) {
          return err(quizResult.error);
        }
      }

      return ok(ctx);
    } catch (cause) {
      return err(DomainError.markdownWriteFailed(cause));
    }
  };

  return {
    A: nodeA,
    B: nodeB,
    C: nodeC,
    D: nodeD,
    E: nodeE,
    F: nodeF,
  };
}
