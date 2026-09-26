import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
// apps/api/src/config/di.ts
import { container } from "tsyringe";

// Token symbols for interface binding
export const TOKENS = {
  IStorageAdapter: Symbol.for("IStorageAdapter"),
  IKnowledgeGraphWriter: Symbol.for("IKnowledgeGraphWriter"),
  IAIReasoningGateway: Symbol.for("IAIReasoningGateway"),
} as const;

export function registerAdapters(
  storageAdapter: IStorageAdapter,
  knowledgeGraphWriter: IKnowledgeGraphWriter,
  aiReasoningGateway: IAIReasoningGateway,
): void {
  container.register(TOKENS.IStorageAdapter, { useValue: storageAdapter });
  container.register(TOKENS.IKnowledgeGraphWriter, {
    useValue: knowledgeGraphWriter,
  });
  container.register(TOKENS.IAIReasoningGateway, {
    useValue: aiReasoningGateway,
  });
}

export function resolveStorageAdapter(): IStorageAdapter {
  return container.resolve(TOKENS.IStorageAdapter);
}

export function resolveKnowledgeGraphWriter(): IKnowledgeGraphWriter {
  return container.resolve(TOKENS.IKnowledgeGraphWriter);
}

export function resolveAIReasoningGateway(): IAIReasoningGateway {
  return container.resolve(TOKENS.IAIReasoningGateway);
}
