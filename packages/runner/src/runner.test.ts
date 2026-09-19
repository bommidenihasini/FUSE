import type { Event, Policy } from "@fuse/contracts";
import { InMemoryFuseRepository } from "@fuse/persistence";
import { SCENARIO_FIXTURES } from "@fuse/test-fixtures";
import { describe, expect, test } from "vitest";
import {
  copyPolicy,
  defaultDemoPolicy,
  InvoiceVerificationRunner,
  RunnerCannotContinueError,
} from "./index.js";

const T0 = "2026-09-18T18:00:00.000Z";

function clock(startIso = T0): () => string {
  let n = 0;
  const start = Date.parse(startIso);
  return () => new Date(start + n++ * 1000).toISOString();
}

function allowedExecutions(events: Event[]): number {
  return events.filter(
    (event) => event.type === "MODEL_CALL_ALLOWED" || event.type === "TOOL_CALL_ALLOWED",
  ).length;
}

function sequences(events: Event[]): number[] {
  return events.map((event) => event.sequence);
}

describe("InvoiceVerificationRunner", () => {
  test("safe scenario completes with INV-DEMO-002", async () => {
    const repo = new InMemoryFuseRepository(() => "run-safe");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("safe-completion");

    expect(result.liveBedrock).toBe(false);
    expect(result.executionMode).toBe("simulation");
    expect(result.syntheticDataLabel).toBe("Synthetic demo data");
    expect(result.run.status).toBe("COMPLETED");
    expect(result.run.scenario).toBe("safe-completion");
    expect(result.toolExecutions).toBe(1);
    expect(result.modelExecutions).toBe(2);
    expect(result.events.map((event) => event.type)).toContain("RUN_COMPLETED");
    expect(result.events.at(-1)?.type).toBe("RUN_COMPLETED");
  });

  test("loop scenario trips the breaker on repeated verify_vendor", async () => {
    const repo = new InMemoryFuseRepository(() => "run-loop");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("invoice-verification-loop");

    expect(result.run.status).toBe("BREAKER_TRIPPED");
    expect(result.run.breakerReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
    expect(result.run.breakerReason).toContain("Next invocation blocked");
    expect(result.events.some((event) => event.type === "POLICY_BLOCKED")).toBe(true);
    expect(
      result.events.find((event) => event.type === "POLICY_BLOCKED")?.metadata?.nextInvocation,
    ).toBe("BLOCKED");
    expect(result.toolExecutions).toBe(3);
  });

  test("error scenario retries and stops safely without an unbounded loop", async () => {
    const repo = new InMemoryFuseRepository(() => "run-error");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("bounded-tool-error");

    expect(result.run.status).toBe("BREAKER_TRIPPED");
    expect(result.run.breakerReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
    expect(result.toolExecutions).toBe(3);
    expect(result.events.filter((event) => event.type === "TOOL_CALL_FAILED")).toHaveLength(3);
    expect(result.run.retryCount).toBe(3);
  });

  test("denied call is never executed", async () => {
    const repo = new InMemoryFuseRepository(() => "run-denied");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("invoice-verification-loop");
    const allowedTools = result.events.filter((event) => event.type === "TOOL_CALL_ALLOWED");
    expect(result.toolExecutions).toBe(allowedTools.length);
    expect(result.events.some((event) => event.type === "POLICY_BLOCKED")).toBe(true);
    expect(result.toolExecutions).toBe(3);
  });

  test("execution count equals allowed calls only", async () => {
    const repo = new InMemoryFuseRepository(() => "run-counts");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const loop = await runner.run("invoice-verification-loop");
    expect(loop.modelExecutions + loop.toolExecutions).toBe(allowedExecutions(loop.events));

    const safeRepo = new InMemoryFuseRepository(() => "run-counts-safe");
    const safe = await new InvoiceVerificationRunner({
      repository: safeRepo,
      nowIso: clock(),
    }).run("safe-completion");
    expect(safe.modelExecutions + safe.toolExecutions).toBe(allowedExecutions(safe.events));
  });

  test("every event is persisted in order", async () => {
    const repo = new InMemoryFuseRepository(() => "run-order");
    const result = await new InvoiceVerificationRunner({
      repository: repo,
      nowIso: clock(),
    }).run("safe-completion");
    const seq = sequences(result.events);
    expect(seq).toEqual(seq.map((_, index) => index + 1));
    expect(result.events[0]?.type).toBe("RUN_CREATED");
    expect(result.events[1]?.type).toBe("RUN_STARTED");
    expect(new Set(seq).size).toBe(seq.length);
  });

  test("the runner cannot continue after COMPLETED", async () => {
    const repo = new InMemoryFuseRepository(() => "run-done");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("safe-completion");
    const models = result.modelExecutions;
    const tools = result.toolExecutions;
    await expect(runner.continueRun(result.run.runId)).rejects.toBeInstanceOf(
      RunnerCannotContinueError,
    );
    expect(runner.modelExecutionCount).toBe(models);
    expect(runner.toolExecutionCount).toBe(tools);
    expect((await repo.getRun(result.run.runId))?.status).toBe("COMPLETED");
  });

  test("the runner cannot continue after BREAKER_TRIPPED", async () => {
    const repo = new InMemoryFuseRepository(() => "run-tripped");
    const runner = new InvoiceVerificationRunner({ repository: repo, nowIso: clock() });
    const result = await runner.run("invoice-verification-loop");
    const tools = result.toolExecutions;
    await expect(runner.continueRun(result.run.runId)).rejects.toMatchObject({
      name: "RunnerCannotContinueError",
      status: "BREAKER_TRIPPED",
    });
    expect(result.toolExecutions).toBe(tools);
    expect(runner.toolExecutionCount).toBe(tools);
    expect((await repo.getRun(result.run.runId))?.status).toBe("BREAKER_TRIPPED");
  });

  test("hard safety cap prevents infinite loops", async () => {
    const repo = new InMemoryFuseRepository(() => "run-cap");
    const at = T0;
    const policy: Policy = {
      ...defaultDemoPolicy(at),
      maxSteps: 100,
      maxRepeatedActionCount: 100,
      maxEstimatedCostUsd: 50,
    };
    const runner = new InvoiceVerificationRunner({
      repository: repo,
      nowIso: clock(),
      policy,
      safetyCap: 4,
    });
    const result = await runner.run("invoice-verification-loop");
    expect(result.run.status).toBe("FAILED");
    expect(result.events.some((event) => event.type === "RUN_FAILED")).toBe(true);
    expect(result.events.some((event) => event.reason === "Hard runner safety cap reached")).toBe(
      true,
    );
    expect(result.modelExecutions).toBeLessThanOrEqual(4);
    expect(result.toolExecutions).toBeLessThanOrEqual(4);
    expect(result.modelExecutions + result.toolExecutions).toBeLessThanOrEqual(8);
  });

  test("inputs and fixture data are not mutated", async () => {
    const before = JSON.stringify(SCENARIO_FIXTURES);
    const policy = copyPolicy(defaultDemoPolicy(T0));
    const repo = new InMemoryFuseRepository(() => "run-immutable");
    const runner = new InvoiceVerificationRunner({
      repository: repo,
      nowIso: clock(),
      policy,
    });
    policy.maxSteps = 1;
    const result = await runner.run("invoice-verification-loop");
    expect(JSON.stringify(SCENARIO_FIXTURES)).toBe(before);
    expect(SCENARIO_FIXTURES["invoice-verification-loop"]?.invoice.amount).toBe(1840.5);
    expect(result.run.policySnapshot.maxSteps).toBe(8);
    expect(policy.maxSteps).toBe(1);
  });
});
