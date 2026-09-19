import type { Event, Policy } from "@fuse/contracts";
import {
  InMemoryFuseRepository,
  type AppendEventInput,
  type FuseRepository,
} from "@fuse/persistence";
import { describe, expect, test } from "vitest";
import { BreakerTrippedError, FailClosedError, Fuse } from "./index.js";
import type { BreakerTrippedNotice, EnforcementCallInput } from "./types.js";

const T0 = "2026-09-18T18:00:00.000Z";
const T1 = "2026-09-18T18:00:01.000Z";

const policy: Policy = {
  policyId: "policy-demo-loop",
  name: "Demo loop policy",
  maxSteps: 8,
  maxEstimatedCostUsd: 1,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 3,
  enabled: true,
  version: 1,
  createdAt: T0,
  updatedAt: T0,
};

function call(runId: string, kind: EnforcementCallInput["kind"] = "tool"): EnforcementCallInput {
  return {
    runId,
    kind,
    name: kind === "tool" ? "verify_vendor" : "converse",
    arguments: { invoiceId: "INV-DEMO-001" },
    proposedEstimatedCostUsd: 0.01,
  };
}

async function runningRun(repo: FuseRepository, snapshot: Policy = policy): Promise<string> {
  const run = await repo.createRun({
    scenario: "invoice-verification-loop",
    policySnapshot: snapshot,
    createdAt: T0,
  });
  await repo.appendEvent(run.runId, { type: "RUN_CREATED", timestamp: T0 });
  await repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: T0 });
  await repo.appendEvent(run.runId, { type: "RUN_STARTED", timestamp: T0 });
  return run.runId;
}

function fuseFor(
  repo: FuseRepository,
  extras: { nowIso?: () => string; notices?: BreakerTrippedNotice[] } = {},
): Fuse {
  return new Fuse({
    repository: repo,
    nowIso: extras.nowIso ?? (() => T1),
    publishBreakerTripped: async (notice) => {
      extras.notices?.push(notice);
    },
  });
}

class CountingExecutor {
  executions = 0;

  async run(): Promise<string> {
    this.executions += 1;
    return `ok-${String(this.executions)}`;
  }
}

describe("Fuse enforcement wrapper", () => {
  test("denied repeated tool is never executed and timeline is persisted", async () => {
    const repo = new InMemoryFuseRepository(() => "run-loop");
    const notices: BreakerTrippedNotice[] = [];
    const fuse = fuseFor(repo, { notices });
    const runId = await runningRun(repo);
    const tool = new CountingExecutor();
    const input = call(runId);

    await fuse.invokeTool(input, () => tool.run());
    await fuse.invokeTool(input, () => tool.run());
    await fuse.invokeTool(input, () => tool.run());
    const executionsBeforeDenial = tool.executions;
    expect(executionsBeforeDenial).toBe(3);

    await expect(fuse.invokeTool(input, () => tool.run())).rejects.toMatchObject({
      name: "BreakerTrippedError",
      reasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
    });

    const executionsAfterDenial = tool.executions;
    expect(executionsAfterDenial).toBe(executionsBeforeDenial);

    await expect(fuse.invokeTool(input, () => tool.run())).rejects.toBeInstanceOf(
      BreakerTrippedError,
    );
    expect(tool.executions).toBe(executionsBeforeDenial);

    const run = await repo.getRun(runId);
    expect(run?.status).toBe("BREAKER_TRIPPED");
    expect(run?.breakerReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
    expect(run?.breakerReason).toContain("Next invocation blocked");
    expect(run?.stepCount).toBe(3);
    expect(run?.toolCallCount).toBe(3);

    const events = await repo.listEvents(runId);
    const types = events.map((event) => event.type);
    expect(types).toContain("POLICY_EVALUATED");
    expect(types).toContain("POLICY_BLOCKED");
    expect(types).toContain("BREAKER_TRIPPED");
    expect(types.filter((type) => type === "TOOL_CALL_ALLOWED")).toHaveLength(3);
    expect(types.filter((type) => type === "TOOL_CALL_COMPLETED")).toHaveLength(3);

    const blocked = events.find((event) => event.type === "POLICY_BLOCKED");
    expect(blocked?.allowed).toBe(false);
    expect(blocked?.metadata?.nextInvocation).toBe("BLOCKED");

    const sequences = events.map((event) => event.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));

    expect(notices).toHaveLength(1);
    expect(notices[0]?.detailType).toBe("BreakerTripped");
    expect(notices[0]?.source).toBe("fuse.breaker");
  });

  test("denied model function is never executed", async () => {
    const repo = new InMemoryFuseRepository(() => "run-model");
    const fuse = fuseFor(repo);
    const runId = await runningRun(repo, { ...policy, maxSteps: 1 });
    const model = new CountingExecutor();
    const input = call(runId, "model");

    await fuse.invokeModel(input, () => model.run());
    expect(model.executions).toBe(1);
    await expect(fuse.invokeModel(input, () => model.run())).rejects.toBeInstanceOf(
      BreakerTrippedError,
    );
    expect(model.executions).toBe(1);
    expect((await repo.getRun(runId))?.status).toBe("BREAKER_TRIPPED");
    expect((await repo.getRun(runId))?.modelCallCount).toBe(1);
  });

  test("allowed tool executes once and afterCall is persisted", async () => {
    const repo = new InMemoryFuseRepository(() => "run-safe");
    const fuse = fuseFor(repo);
    const runId = await runningRun(repo, { ...policy, maxRepeatedActionCount: 8 });
    const tool = new CountingExecutor();

    const result = await fuse.invokeTool(call(runId), () => tool.run());
    expect(result).toBe("ok-1");
    expect(tool.executions).toBe(1);
    expect((await repo.getRun(runId))?.status).toBe("RUNNING");
    const types = (await repo.listEvents(runId)).map((event) => event.type);
    expect(types).toEqual([
      "RUN_CREATED",
      "RUN_STARTED",
      "POLICY_EVALUATED",
      "TOOL_CALL_ALLOWED",
      "TOOL_CALL_COMPLETED",
    ]);
  });

  test("beforeCall deny does not execute a following manual tool call", async () => {
    const repo = new InMemoryFuseRepository(() => "run-manual");
    const fuse = fuseFor(repo);
    const runId = await runningRun(repo, { ...policy, maxSteps: 0 });
    const tool = new CountingExecutor();

    const decision = await fuse.beforeCall(call(runId));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("Next invocation blocked");
    expect(tool.executions).toBe(0);
    expect((await repo.getRun(runId))?.status).toBe("BREAKER_TRIPPED");
  });

  test("failed tool still counts as an executed call; retry is recorded", async () => {
    const repo = new InMemoryFuseRepository(() => "run-fail-tool");
    const fuse = fuseFor(repo);
    const runId = await runningRun(repo);
    let executions = 0;

    await expect(
      fuse.invokeTool(call(runId), async () => {
        executions += 1;
        throw new Error("synthetic tool_error");
      }),
    ).rejects.toThrow("synthetic tool_error");

    expect(executions).toBe(1);
    expect((await repo.getRun(runId))?.retryCount).toBe(1);
    expect((await repo.listEvents(runId)).map((event) => event.type)).toContain("TOOL_CALL_FAILED");
  });

  test("CREATED run is denied without executing or invalid transition", async () => {
    const repo = new InMemoryFuseRepository(() => "run-created");
    const fuse = fuseFor(repo);
    const created = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: T0,
    });
    const tool = new CountingExecutor();
    await expect(fuse.invokeTool(call(created.runId), () => tool.run())).rejects.toMatchObject({
      reasonCode: "RUN_NOT_RUNNING",
    });
    expect(tool.executions).toBe(0);
    expect((await repo.getRun(created.runId))?.status).toBe("CREATED");
  });

  test("runtime limit uses injected clock, not a live Date.now call inside evaluate", async () => {
    const repo = new InMemoryFuseRepository(() => "run-runtime");
    const fuse = new Fuse({
      repository: repo,
      nowIso: () => "2026-09-18T18:00:30.000Z",
    });
    const runId = await runningRun(repo, { ...policy, maxRuntimeMs: 30_000 });
    const tool = new CountingExecutor();
    await expect(fuse.invokeTool(call(runId), () => tool.run())).rejects.toMatchObject({
      reasonCode: "MAX_RUNTIME_EXCEEDED",
    });
    expect(tool.executions).toBe(0);
  });

  test("fail closed: audit write failure prevents the underlying call", async () => {
    const inner = new InMemoryFuseRepository(() => "run-closed");
    const runId = await runningRun(inner);
    const repo: FuseRepository = {
      createRun: (input) => inner.createRun(input),
      getRun: (id) => inner.getRun(id),
      getPolicySnapshot: (id) => inner.getPolicySnapshot(id),
      updateRunCounters: (id, counters) => inner.updateRunCounters(id, counters),
      transitionRunState: (input) => inner.transitionRunState(input),
      listEvents: (id) => inner.listEvents(id),
      appendEvent: async (id: string, event: AppendEventInput): Promise<Event> => {
        if (event.type === "POLICY_EVALUATED") {
          throw new Error("dynamo unavailable");
        }
        return inner.appendEvent(id, event);
      },
    };
    const fuse = fuseFor(repo);
    const tool = new CountingExecutor();
    await expect(fuse.invokeTool(call(runId), () => tool.run())).rejects.toBeInstanceOf(
      FailClosedError,
    );
    expect(tool.executions).toBe(0);
    expect((await inner.getRun(runId))?.status).toBe("RUNNING");
  });

  test("publisher failure after persist does not execute the denied call", async () => {
    const repo = new InMemoryFuseRepository(() => "run-bus");
    const fuse = new Fuse({
      repository: repo,
      nowIso: () => T1,
      publishBreakerTripped: async () => {
        throw new Error("eventbridge unavailable");
      },
    });
    const runId = await runningRun(repo, { ...policy, maxSteps: 0 });
    const tool = new CountingExecutor();
    await expect(fuse.invokeTool(call(runId), () => tool.run())).rejects.toBeInstanceOf(
      BreakerTrippedError,
    );
    expect(tool.executions).toBe(0);
    expect((await repo.getRun(runId))?.status).toBe("BREAKER_TRIPPED");
  });

  test("tripBreaker is idempotent after BREAKER_TRIPPED", async () => {
    const repo = new InMemoryFuseRepository(() => "run-idempotent");
    const fuse = fuseFor(repo);
    const runId = await runningRun(repo, { ...policy, maxSteps: 0 });
    await expect(fuse.invokeTool(call(runId), async () => "nope")).rejects.toBeInstanceOf(
      BreakerTrippedError,
    );
    const again = await fuse.tripBreaker(runId, "Next invocation blocked");
    expect(again.status).toBe("BREAKER_TRIPPED");
    const trips = (await repo.listEvents(runId)).filter(
      (event) => event.type === "BREAKER_TRIPPED",
    );
    expect(trips).toHaveLength(1);
  });
});
