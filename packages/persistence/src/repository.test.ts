import { randomUUID } from "node:crypto";
import type { Policy } from "@fuse/contracts";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, test } from "vitest";
import { DynamoFuseRepository } from "./dynamodb.js";
import {
  DuplicateEventError,
  DuplicateRunError,
  InvalidTransitionError,
  isAllowedTransition,
  RunNotFoundError,
  RunNotRunningError,
  TerminalRunError,
} from "./errors.js";
import { FakeDocumentClient } from "./fake-document-client.js";
import { InMemoryFuseRepository } from "./in-memory.js";
import { sanitizeMetadata } from "./sanitize.js";
import type { FuseRepository } from "./types.js";

const FIXED = "2026-09-18T18:00:00.000Z";
const LATER = "2026-09-18T18:00:05.000Z";

const policy: Policy = {
  policyId: "policy-demo-safe",
  name: "Demo safe policy",
  maxSteps: 8,
  maxEstimatedCostUsd: 0.25,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 3,
  enabled: true,
  version: 1,
  createdAt: FIXED,
  updatedAt: FIXED,
};

function memoryRepo(): FuseRepository {
  let n = 0;
  return new InMemoryFuseRepository(() => `run-mem-${String((n += 1))}`);
}

function dynamoRepo(): FuseRepository {
  const fake = new FakeDocumentClient("FuseRuns", "FuseEvents");
  let n = 0;
  return new DynamoFuseRepository({
    docClient: fake as unknown as DynamoDBDocumentClient,
    runsTable: "FuseRuns",
    eventsTable: "FuseEvents",
    createId: () => `run-ddb-${String((n += 1))}`,
  });
}

describe.each([
  ["in-memory", memoryRepo],
  ["dynamodb-fake", dynamoRepo],
] as const)("FuseRepository (%s)", (_name, factory) => {
  test("createRun stores policy snapshot, scenario, counters, and ISO timestamp", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    expect(run.status).toBe("CREATED");
    expect(run.scenario).toBe("invoice-verification-loop");
    expect(run.startedAt).toBe(FIXED);
    expect(run.stepCount).toBe(0);
    expect(run.estimatedCostUsd).toBe(0);
    expect(run.policySnapshot).toEqual(policy);
    const loaded = await repo.getRun(run.runId);
    expect(loaded?.policySnapshot.maxRepeatedActionCount).toBe(3);
  });

  test("createRun uses server-generated ids", async () => {
    const repo = factory();
    const a = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    const b = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    expect(a.runId).not.toBe(b.runId);
  });

  test("getPolicySnapshot returns the persisted snapshot, not a live policy table", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    const snapshot = await repo.getPolicySnapshot(run.runId);
    expect(snapshot).toEqual(policy);
    snapshot.maxSteps = 99;
    expect((await repo.getPolicySnapshot(run.runId)).maxSteps).toBe(8);
  });

  test("allowed transitions", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    const running = await repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: FIXED });
    expect(running.status).toBe("RUNNING");
    const done = await repo.transitionRunState({ runId: run.runId, to: "COMPLETED", at: LATER });
    expect(done.status).toBe("COMPLETED");
    expect(done.endedAt).toBe(LATER);
  });

  test("RUNNING can fail or trip the breaker", async () => {
    const failedRepo = factory();
    const failed = await failedRepo.createRun({
      scenario: "bounded-tool-error",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await failedRepo.transitionRunState({ runId: failed.runId, to: "RUNNING", at: FIXED });
    expect(
      (await failedRepo.transitionRunState({ runId: failed.runId, to: "FAILED", at: LATER }))
        .status,
    ).toBe("FAILED");

    const tripRepo = factory();
    const trip = await tripRepo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await tripRepo.transitionRunState({ runId: trip.runId, to: "RUNNING", at: FIXED });
    const tripped = await tripRepo.transitionRunState({
      runId: trip.runId,
      to: "BREAKER_TRIPPED",
      at: LATER,
      breakerReason: "Next invocation blocked: repeated normalized action",
      breakerReasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
    });
    expect(tripped.status).toBe("BREAKER_TRIPPED");
    expect(tripped.breakerReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
  });

  test("invalid transitions are rejected", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await expect(
      repo.transitionRunState({ runId: run.runId, to: "COMPLETED", at: LATER }),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    await repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: FIXED });
    await repo.transitionRunState({ runId: run.runId, to: "COMPLETED", at: LATER });
    await expect(
      repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: LATER }),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  test("updateRunCounters only while RUNNING", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await expect(
      repo.updateRunCounters(run.runId, {
        stepCount: 1,
        modelCallCount: 1,
        toolCallCount: 0,
        retryCount: 0,
        estimatedCostUsd: 0.001,
      }),
    ).rejects.toBeInstanceOf(RunNotRunningError);
    await repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: FIXED });
    const updated = await repo.updateRunCounters(run.runId, {
      stepCount: 2,
      modelCallCount: 1,
      toolCallCount: 1,
      retryCount: 0,
      estimatedCostUsd: 0.004,
    });
    expect(updated.stepCount).toBe(2);
    expect(updated.estimatedCostUsd).toBe(0.004);
  });

  test("appendEvent assigns ordered sequences and listEvents returns them in order", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    const first = await repo.appendEvent(run.runId, { type: "RUN_CREATED", timestamp: FIXED });
    const second = await repo.appendEvent(run.runId, { type: "RUN_STARTED", timestamp: LATER });
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    const listed = await repo.listEvents(run.runId);
    expect(listed.map((event) => event.type)).toEqual(["RUN_CREATED", "RUN_STARTED"]);
  });

  test("terminal runs reject appendEvent and counter updates", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "safe-completion",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await repo.transitionRunState({ runId: run.runId, to: "RUNNING", at: FIXED });
    await repo.transitionRunState({ runId: run.runId, to: "COMPLETED", at: LATER });
    await expect(
      repo.appendEvent(run.runId, { type: "TOOL_CALL_ALLOWED", timestamp: LATER }),
    ).rejects.toBeInstanceOf(TerminalRunError);
    await expect(
      repo.updateRunCounters(run.runId, {
        stepCount: 9,
        modelCallCount: 9,
        toolCallCount: 9,
        retryCount: 0,
        estimatedCostUsd: 1,
      }),
    ).rejects.toBeInstanceOf(TerminalRunError);
    const listed = await repo.listEvents(run.runId);
    expect(listed).toEqual([]);
  });

  test("missing runs fail closed", async () => {
    const repo = factory();
    await expect(repo.getPolicySnapshot("missing")).rejects.toBeInstanceOf(RunNotFoundError);
    expect(await repo.getRun("missing")).toBeUndefined();
  });

  test("event metadata does not store prompts or secrets", async () => {
    const repo = factory();
    const run = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    const event = await repo.appendEvent(run.runId, {
      type: "MODEL_CALL_ALLOWED",
      timestamp: FIXED,
      kind: "model",
      name: "bedrock.converse",
      metadata: {
        invoiceId: "INV-DEMO-001",
        prompt: "secret prompt text",
        apiKey: "secret-key",
        arguments: { prompt: "also secret" },
      },
    });
    expect(event.metadata?.["prompt"]).toBe("<redacted>");
    expect(event.metadata?.["apiKey"]).toBe("<redacted>");
    expect(event.metadata?.["arguments"]).toBe("<redacted>");
    expect(event.metadata?.["invoiceId"]).toBe("INV-DEMO-001");
    const listed = await repo.listEvents(run.runId);
    expect(JSON.stringify(listed)).not.toContain("secret prompt");
    expect(JSON.stringify(listed)).not.toContain("secret-key");
  });
});

describe("transition table", () => {
  test("documents allowed edges only", () => {
    expect(isAllowedTransition("CREATED", "RUNNING")).toBe(true);
    expect(isAllowedTransition("RUNNING", "COMPLETED")).toBe(true);
    expect(isAllowedTransition("RUNNING", "FAILED")).toBe(true);
    expect(isAllowedTransition("RUNNING", "BREAKER_TRIPPED")).toBe(true);
    expect(isAllowedTransition("CREATED", "COMPLETED")).toBe(false);
    expect(isAllowedTransition("COMPLETED", "RUNNING")).toBe(false);
    expect(isAllowedTransition("BREAKER_TRIPPED", "RUNNING")).toBe(false);
  });
});

describe("DynamoDB duplicate conditions", () => {
  test("duplicate runId is rejected", async () => {
    const fake = new FakeDocumentClient("FuseRuns", "FuseEvents");
    const repo = new DynamoFuseRepository({
      docClient: fake as unknown as DynamoDBDocumentClient,
      runsTable: "FuseRuns",
      eventsTable: "FuseEvents",
      createId: () => "run-fixed",
    });
    await repo.createRun({ scenario: "safe-completion", policySnapshot: policy, createdAt: FIXED });
    await expect(
      repo.createRun({ scenario: "safe-completion", policySnapshot: policy, createdAt: FIXED }),
    ).rejects.toBeInstanceOf(DuplicateRunError);
  });

  test("duplicate event sequence is rejected", async () => {
    const fake = new FakeDocumentClient("FuseRuns", "FuseEvents");
    const repo = new DynamoFuseRepository({
      docClient: fake as unknown as DynamoDBDocumentClient,
      runsTable: "FuseRuns",
      eventsTable: "FuseEvents",
      createId: () => randomUUID(),
    });
    const run = await repo.createRun({
      scenario: "invoice-verification-loop",
      policySnapshot: policy,
      createdAt: FIXED,
    });
    await repo.appendEvent(run.runId, { type: "RUN_CREATED", timestamp: FIXED });
    const storedRun = fake.runs.get(run.runId);
    expect(storedRun).toBeDefined();
    if (storedRun !== undefined) {
      storedRun["nextEventSequence"] = 1;
    }
    await expect(
      repo.appendEvent(run.runId, { type: "RUN_STARTED", timestamp: LATER }),
    ).rejects.toBeInstanceOf(DuplicateEventError);
  });
});

describe("sanitizeMetadata", () => {
  test("redacts sensitive keys and leaves invoice fields", () => {
    expect(sanitizeMetadata({ invoiceId: "INV-DEMO-001", prompt: "nope" })).toEqual({
      invoiceId: "INV-DEMO-001",
      prompt: "<redacted>",
    });
  });
});
