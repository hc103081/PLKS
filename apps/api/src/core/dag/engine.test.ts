import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
// apps/api/src/core/dag/engine.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "../errors/domain-errors.js";
import { type DagContext, DagEngine, type DagNode } from "./engine.js";

describe("DagEngine", () => {
  type TestContext = DagContext & { value: number; a?: number; b?: number; c?: number };

  const createNode = <T extends DagContext>(
    name: string,
    deps: string[],
    fn: (ctx: T) => Promise<Result<T, DomainError>>,
  ): DagNode<T> => ({
    name,
    dependencies: deps,
    execute: fn,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a single node with no dependencies", async () => {
    const node = createNode<TestContext>("A", [], async (ctx) =>
      ok({ ...ctx, value: ctx.value + 1 }),
    );

    const engine = new DagEngine<TestContext>([node]);
    const result = await engine.execute({ value: 0 });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.value).toBe(1);
    }
  });

  it("executes nodes in dependency order", async () => {
    const order: string[] = [];

    const nodeA = createNode<TestContext>("A", [], async (ctx) => {
      order.push("A");
      return ok({ ...ctx, value: ctx.value + 1 });
    });
    const nodeB = createNode<TestContext>("B", ["A"], async (ctx) => {
      order.push("B");
      return ok({ ...ctx, value: ctx.value + 10 });
    });
    const nodeC = createNode<TestContext>("C", ["B"], async (ctx) => {
      order.push("C");
      return ok({ ...ctx, value: ctx.value + 100 });
    });

    const engine = new DagEngine<TestContext>([nodeA, nodeB, nodeC]);
    const result = await engine.execute({ value: 0 });

    expect(result.isOk()).toBe(true);
    expect(order).toEqual(["A", "B", "C"]);
    if (result.isOk()) {
      expect(result.value.value).toBe(111);
    }
  });

  it("executes independent nodes in parallel", async () => {
    const startTimes: Record<string, number> = {};

    const nodeA = createNode<TestContext>("A", [], async (ctx) => {
      startTimes.A = Date.now();
      await new Promise((r) => setTimeout(r, 10));
      return ok({ ...ctx, a: ctx.value + 1 });
    });
    const nodeB = createNode<TestContext>("B", [], async (ctx) => {
      startTimes.B = Date.now();
      await new Promise((r) => setTimeout(r, 10));
      return ok({ ...ctx, b: ctx.value + 10 });
    });
    const nodeC = createNode<TestContext>("C", ["A", "B"], async (ctx) => {
      startTimes.C = Date.now();
      return ok({ ...ctx, c: (ctx.a ?? 0) + (ctx.b ?? 0) + 100 });
    });

    const engine = new DagEngine<TestContext>([nodeA, nodeB, nodeC]);
    const result = await engine.execute({ value: 0 });

    expect(result.isOk()).toBe(true);
    // A and B should start at roughly the same time (parallel)
    expect(startTimes.C).toBeGreaterThan(startTimes.A);
    expect(startTimes.C).toBeGreaterThan(startTimes.B);
    if (result.isOk()) {
      expect(result.value.a).toBe(1);
      expect(result.value.b).toBe(10);
      expect(result.value.c).toBe(111);
    }
  });

  it("stops execution and returns error when a node fails", async () => {
    const nodeA = createNode<TestContext>("A", [], async (ctx) =>
      ok({ ...ctx, value: ctx.value + 1 }),
    );
    const nodeB = createNode<TestContext>("B", ["A"], async (_ctx) =>
      err(DomainError.dagExecutionFailed("B", new Error("Node B failed"))),
    );
    const nodeC = createNode<TestContext>("C", ["B"], async (ctx) =>
      ok({ ...ctx, value: ctx.value + 100 }),
    );

    const engine = new DagEngine<TestContext>([nodeA, nodeB, nodeC], {
      maxRetries: 0,
      baseDelayMs: 1,
    });
    const result = await engine.execute({ value: 0 });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("DAG_EXECUTION_FAILED");
      expect(result.error.message).toContain("B");
    }
  });

  it("allows retry of failed nodes", async () => {
    let attemptCount = 0;

    const nodeA = createNode<TestContext>("A", [], async (ctx) => {
      attemptCount++;
      if (attemptCount < 3) {
        return err(DomainError.dagExecutionFailed("A", new Error("Temporary failure")));
      }
      return ok({ ...ctx, value: ctx.value + 1 });
    });

    const engine = new DagEngine<TestContext>([nodeA], { maxRetries: 3, baseDelayMs: 1 });
    const result = await engine.execute({ value: 0 });

    expect(result.isOk()).toBe(true);
    expect(attemptCount).toBe(3);
    if (result.isOk()) {
      expect(result.value.value).toBe(1);
    }
  });

  it("fails after max retries exceeded", async () => {
    let attemptCount = 0;

    const nodeA = createNode<TestContext>("A", [], async (_ctx) => {
      attemptCount++;
      return err(DomainError.dagExecutionFailed("A", new Error("Permanent failure")));
    });

    const engine = new DagEngine<TestContext>([nodeA], { maxRetries: 2, baseDelayMs: 1 });
    const result = await engine.execute({ value: 0 });

    expect(result.isErr()).toBe(true);
    expect(attemptCount).toBe(3); // initial + 2 retries
  });

  it("validates DAG has no cycles", async () => {
    const nodeA = createNode<TestContext>("A", ["B"], async (ctx) => ok(ctx));
    const nodeB = createNode<TestContext>("B", ["A"], async (ctx) => ok(ctx));

    expect(() => new DagEngine<TestContext>([nodeA, nodeB])).toThrow("Cycle detected");
  });

  it("validates all dependencies exist", async () => {
    const nodeA = createNode<TestContext>("A", ["NonExistent"], async (ctx) => ok(ctx));

    expect(() => new DagEngine<TestContext>([nodeA])).toThrow("Dependency not found");
  });

  it("returns context with all node results", async () => {
    const nodeA = createNode<TestContext>("A", [], async (ctx) => ok({ ...ctx, a: ctx.value + 1 }));
    const nodeB = createNode<TestContext>("B", [], async (ctx) =>
      ok({ ...ctx, b: ctx.value + 10 }),
    );

    const engine = new DagEngine<TestContext>([nodeA, nodeB]);
    const result = await engine.execute({ value: 5 });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.a).toBe(6);
      expect(result.value.b).toBe(15);
    }
  });
});
