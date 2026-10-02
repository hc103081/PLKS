// apps/api/src/config/di.ts
import type { IStorageAdapter } from "@plks/shared/contracts";
import type { IKnowledgeGraphWriter } from "@plks/shared/contracts";
import type { IAIReasoningGateway } from "@plks/shared/contracts";
import type { IStructuredStore } from "@plks/shared/contracts";
// apps/api/src/config/di.ts
import { container } from "tsyringe";

// Token symbols for interface binding
export const TOKENS = {
  IStorageAdapter: Symbol.for("IStorageAdapter"),
  IKnowledgeGraphWriter: Symbol.for("IKnowledgeGraphWriter"),
  IAIReasoningGateway: Symbol.for("IAIReasoningGateway"),
  IStructuredStore: Symbol.for("IStructuredStore"),
} as const;

export function registerAdapters(
  storageAdapter: IStorageAdapter,
  knowledgeGraphWriter: IKnowledgeGraphWriter,
  aiReasoningGateway: IAIReasoningGateway,
  structuredStore: IStructuredStore,
): void {
  container.register(TOKENS.IStorageAdapter, { useValue: storageAdapter });
  container.register(TOKENS.IKnowledgeGraphWriter, {
    useValue: knowledgeGraphWriter,
  });
  container.register(TOKENS.IAIReasoningGateway, {
    useValue: aiReasoningGateway,
  });
  container.register(TOKENS.IStructuredStore, {
    useValue: structuredStore,
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

export function resolveStructuredStore(): IStructuredStore {
  return container.resolve(TOKENS.IStructuredStore);
}
