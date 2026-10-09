import { DomainError } from "@plks/shared/errors";
// apps/api/src/core/dag/engine.ts
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

export type DagContext = Record<string, unknown>;

export interface DagNode<T extends DagContext> {
  name: string;
  dependencies: string[];
  execute(ctx: T): Promise<Result<T, DomainError>>;
}

export interface DagEngineOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * DAG Engine for executing nodes in topological order with retry support
 */
export class DagEngine<T extends DagContext> {
  private readonly nodes: Map<string, DagNode<T>>;
  private readonly adjacency: Map<string, string[]>;
  private readonly reverseAdjacency: Map<string, string[]>;
  private readonly options: Required<DagEngineOptions>;

  constructor(nodes: DagNode<T>[], options: DagEngineOptions = {}) {
    this.nodes = new Map(nodes.map((n) => [n.name, n]));
    this.adjacency = new Map();
    this.reverseAdjacency = new Map();
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1000,
    };

    this.buildGraph(nodes);
    this.validateDag();
  }

  private buildGraph(nodes: DagNode<T>[]): void {
    for (const node of nodes) {
      this.adjacency.set(node.name, [...node.dependencies]);
      for (const dep of node.dependencies) {
        const rev = this.reverseAdjacency.get(dep) ?? [];
        rev.push(node.name);
        this.reverseAdjacency.set(dep, rev);
      }
      // Ensure all nodes have entries
      if (!this.reverseAdjacency.has(node.name)) {
        this.reverseAdjacency.set(node.name, []);
      }
    }
  }

  private validateDag(): void {
    // Check all dependencies exist
    for (const [name, deps] of this.adjacency) {
      for (const dep of deps) {
        if (!this.nodes.has(dep)) {
          throw new Error(`Dependency not found: ${dep} required by ${name}`);
        }
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = this.reverseAdjacency.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          throw new Error("Cycle detected");
        }
      }
    }
  }

  private topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const [name, deps] of this.adjacency) {
      inDegree.set(name, deps.length);
      if (deps.length === 0) {
        queue.push(name);
      }
    }

    // Kahn's algorithm
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        throw new Error("Invariant: queue should not be empty");
      }
      result.push(current);

      const neighbors = this.reverseAdjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        const degree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== this.nodes.size) {
      throw new Error("Cycle detected during topological sort");
    }

    return result;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithRetry(node: DagNode<T>, ctx: T): Promise<Result<T, DomainError>> {
    let lastError: DomainError | null = null;

    // maxRetries = number of retries, so total attempts = maxRetries + 1
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      const result = await node.execute(ctx);

      if (result.isOk()) {
        return ok(result.value);
      }

      lastError = result.error;

      if (attempt < this.options.maxRetries) {
        const delay = this.options.baseDelayMs * 2 ** attempt;
        await this.sleep(delay);
      }
    }

    return err(
      lastError ?? DomainError.dagExecutionFailed(node.name, new Error("Max retries exceeded")),
    );
  }

  async execute(initialContext: T): Promise<Result<T, DomainError>> {
    const sortedNodes = this.topologicalSort();
    let currentContext = initialContext;

    // Group nodes by level for parallel execution
    const levels = this.computeLevels(sortedNodes);

    for (const level of levels) {
      // Execute all nodes in this level nodes in parallel
      const results = await Promise.all(
        level.map((nodeName) => {
          const node = this.nodes.get(nodeName);
          if (!node) {
            throw new Error(`Node not found: ${nodeName}`);
          }
          return this.executeWithRetry(node, currentContext);
        }),
      );

      // Check for errors
      for (const result of results) {
        if (result.isErr()) {
          return err(result.error);
        }
      }

      // All results are Ok at this point, safe to access .value
      const successfulResults = results as Array<{ isOk(): true; value: T }>;

      // Merge all successful results into current context
      for (const result of successfulResults) {
        currentContext = this.mergeContext(currentContext, result.value);
      }
    }

    return ok(currentContext);
  }

  private mergeContext(base: T, update: T): T {
    // Shallow merge - update properties from update into base
    return { ...base, ...update } as T;
  }

  private computeLevels(sortedNodes: string[]): string[][] {
    const levels: string[][] = [];
    const nodeLevel = new Map<string, number>();

    for (const nodeName of sortedNodes) {
      const deps = this.adjacency.get(nodeName) ?? [];
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
