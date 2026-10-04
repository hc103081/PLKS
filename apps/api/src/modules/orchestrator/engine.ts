// apps/api/src/modules/orchestrator/engine.ts
import { DagEngine } from "../../core/dag/engine.js";
import type { PipelineContext } from "./nodes.js";
import { injectable } from "tsyringe";

import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";

import { type Result, err, ok } from "neverthrow";

import { createPipelineNodes } from "./nodes.js";
import type { DomainError } from "../../core/errors/domain-errors.js";

/**
 * Pipeline nodes created via dependency injection.
 * Each node follows the PLKS pattern: async -> Result<PipelineContext, DomainError>
 */
export type { PipelineContext };

/**
 * Engine options for the Orchestrator DAG Engine.
 * Configures retry behavior and timeout settings.
 */
export interface OrchestratorDagEngineOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Configured DAG Engine for the PLKS Orchestrator Phase 3.
 * 
 * Executes the 6-node pipeline (A-F):
 *   Node A: Load Data - Read RawAssetPayload from Supabase/B2
 *   Node B: B2 URL Signing - Generate 15-minute presigned URLs for visual assets
 *   Node C: Prompt Assembly - Interleave text and image URLs into system prompt
 *   Node D: AI Execution - Parallel call to NVIDIA NIM multimodal inference
 *   Node E: Validation - Zod schema validation with retry on failure
 *   Node F: Persistence - Write to Supabase via IStructuredStore + markdown via IKnowledgeGraphWriter
 * 
 * All nodes follow the Result/Either pattern for error handling.
 * The engine provides topological ordering, parallel execution per level,
 * and exponential backoff retry support.
 */
@injectable()
export class OrchestratorDagEngine {
  private readonly dagEngine: DagEngine<PipelineContext>;

  constructor(
    private readonly storage: IStorageAdapter,
    private readonly graphWriter: IKnowledgeGraphWriter,
    private readonly aiGateway: IAIReasoningGateway,
    options: OrchestratorDagEngineOptions = {},
  ) {
    const pipelineNodes = createPipelineNodes(
      storage,
      graphWriter,
      aiGateway,
    );

    this.dagEngine = new DagEngine<PipelineContext>(
      [
        { name: "A", dependencies: [], execute: pipelineNodes.A },
        { name: "B", dependencies: [], execute: pipelineNodes.B },
        { name: "C", dependencies: ["B"], execute: pipelineNodes.C },
        { name: "D", dependencies: ["C"], execute: pipelineNodes.D },
        { name: "E", dependencies: ["D"], execute: pipelineNodes.E },
        { name: "F", dependencies: ["E"], execute: pipelineNodes.F },
      ],
      {
        maxRetries: options.maxRetries ?? 3,
        baseDelayMs: options.baseDelayMs ?? 1000,
      },
    );
  }

  /**
   * Execute the full orchestrator pipeline with the given initial context.
   * 
   * @param initialContext - Minimum required: { sessionId, courseId }
   * @returns Result containing the final PipelineContext after all nodes execute, or DomainError
   */
  async execute(initialContext: PipelineContext): Promise<Result<PipelineContext, DomainError>> {
    return this.dagEngine.execute(initialContext);
  }

  /**
   * Get the topological order of nodes for debugging/inspection.
   * 
   * @returns Array of node names in execution order
   */
  getNodeExecutionOrder(): string[] {
    // Use the internal topological sort from DagEngine
    // @ts-expect-error - accessing internal state for inspection
    return this.dagEngine["topologicalSort"]?.() ?? [];
  }

  /**
   * Get the computed levels for parallel execution.
   * 
   * @returns Array of level arrays, each containing node names that can run in parallel
   */
  getExecutionLevels(): string[][] {
    const sortedNodes = this.getNodeExecutionOrder();
    const nodeLevel = new Map<string, number>();
    const levels: string[][] = [];

    for (const nodeName of sortedNodes) {
      const deps = this.dagEngine["adjacency"].get(nodeName) ?? [];
      let maxDepLevel = -1;

      for (const dep of deps) {
        const depLevel = nodeLevel.get(dep) ?? 0;
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      const level = maxDepLevel + 1;
      nodeLevel.set(nodeName, level);

      if (!levels[level]) {
        levels[level] = [];
      }
      levels[level].push(nodeName);
    }

    return levels;
  }
}

/**
 * Default orchestrator DAG engine options with max 3 retries and 1s base delay.
 */
export const defaultOrchestratorDagEngineOptions: OrchestratorDagEngineOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

/**
 * Execute the orchestrator DAG engine with the given dependencies and context.
 * 
 * @param storage - IStorageAdapter implementation
 * @param graphWriter - IKnowledgeGraphWriter implementation
 * @param aiGateway - IAIReasoningGateway implementation
 * @param initialContext - Initial pipeline context { sessionId, courseId }
 * @param options - Engine options (maxRetries, baseDelayMs)
 * @returns Result containing the final PipelineContext or DomainError
 */
export async function executeOrchestratorDag(
  storage: IStorageAdapter,
  graphWriter: IKnowledgeGraphWriter,
  aiGateway: IAIReasoningGateway,
  initialContext: PipelineContext,
  options: OrchestratorDagEngineOptions = defaultOrchestratorDagEngineOptions,
): Promise<Result<PipelineContext, DomainError>> {
  const engine = new OrchestratorDagEngine(storage, graphWriter, aiGateway, options);
  return engine.execute(initialContext);
}

/**
 * Check if a Result is Ok (type guard for neverthrow Result).
 * @deprecated Use result.isOk() directly instead
 */
export const isOk = <T, E>(result: Result<T, E>): boolean => result.isOk();

/**
 * Check if a Result is Err (type guard for neverthrow Result).
 * @deprecated Use result.isErr() directly instead
 */
export const isErr = <T, E>(result: Result<T, E>): boolean => result.isErr();

export type { DomainError } from "../../core/errors/domain-errors.js";