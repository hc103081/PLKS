// apps/api/src/modules/orchestrator/nodes.ts
import { Readable } from "node:stream";
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import { DomainError } from "@plks/shared/errors";
import type { RawAssetPayload } from "@plks/shared/schemas";
import type { ConceptNodePayload } from "@plks/shared/schemas";
import { type AiExtractionResult, AiExtractionResultSchema } from "@plks/shared/schemas";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { RawAsset } from "../../core/entities/raw-asset.js";

export interface PipelineContext extends Record<string, unknown> {
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
      if (cause instanceof DomainError) {
        return err(cause);
      }
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
      const systemPrompt = "knowledge-extraction";

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
      if (cause instanceof DomainError) {
        return err(cause);
      }
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
      if (cause instanceof DomainError) {
        return err(cause);
      }
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
      if (cause instanceof DomainError) {
        return err(cause);
      }
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
      if (cause instanceof DomainError) {
        return err(cause);
      }
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
