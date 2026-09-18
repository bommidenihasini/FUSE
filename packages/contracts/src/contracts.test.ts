import { expect, test } from "vitest";
import {
  CALL_KINDS,
  EVENT_TYPES,
  POLICY_REASON_CODES,
  RUN_STATUSES,
  type BeforeCallInput,
  type Event,
  type Policy,
  type PolicyDecision,
  type Run,
  type ToolRequest,
  type ToolResult,
} from "./index.js";

const FIXED_ISO = "2026-09-18T18:00:00.000Z";

const demoPolicy: Policy = {
  policyId: "policy-demo-safe",
  name: "Demo safe policy",
  maxSteps: 8,
  maxEstimatedCostUsd: 0.25,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 3,
  enabled: true,
  version: 1,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
};

test("required contract types compile and can be instantiated", () => {
  const run: Run = {
    runId: "run-fixture-001",
    scenario: "invoice-verification-loop",
    status: "RUNNING",
    policySnapshot: demoPolicy,
    stepCount: 2,
    modelCallCount: 1,
    toolCallCount: 1,
    retryCount: 0,
    estimatedCostUsd: 0.002,
    startedAt: FIXED_ISO,
  };

  const modelInput: BeforeCallInput = {
    runId: run.runId,
    kind: "model",
    name: "bedrock.converse",
    arguments: { scenario: run.scenario },
  };

  const toolInput: BeforeCallInput = {
    runId: run.runId,
    kind: "tool",
    name: "verify_vendor",
    arguments: { invoiceId: "INV-DEMO-001" },
  };

  const allow: PolicyDecision = {
    allowed: true,
    observed: {
      steps: 2,
      estimatedCostUsd: 0.002,
      elapsedMs: 1200,
      repeatedActionCount: 1,
    },
    policy: demoPolicy,
  };

  const block: PolicyDecision = {
    allowed: false,
    reasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
    reason: "Next invocation blocked: repeated normalized action",
    observed: {
      steps: 5,
      estimatedCostUsd: 0.008,
      elapsedMs: 4000,
      repeatedActionCount: 4,
    },
    policy: demoPolicy,
  };

  const request: ToolRequest = {
    name: "verify_vendor",
    arguments: { invoiceId: "INV-DEMO-001" },
  };

  const result: ToolResult = {
    name: "verify_vendor",
    ok: true,
    output: { status: "ambiguous" },
  };

  const event: Event = {
    runId: run.runId,
    sequence: 1,
    type: "POLICY_BLOCKED",
    timestamp: FIXED_ISO,
    kind: "tool",
    name: "verify_vendor",
    allowed: false,
    reasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
    estimatedCostUsd: 0.008,
    metadata: { signature: "verify_vendor:fixture" },
  };

  expect(run.status).toBe("RUNNING");
  expect(modelInput.kind).toBe("model");
  expect(toolInput.kind).toBe("tool");
  expect(allow.allowed).toBe(true);
  expect(block.allowed).toBe(false);
  expect(block.reasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
  expect(request.name).toBe("verify_vendor");
  expect(result.ok).toBe(true);
  expect(event.sequence).toBe(1);
  expect(event.estimatedCostUsd).toBe(0.008);
});

test("run states, call kinds, and policy reason codes are explicit", () => {
  expect([...RUN_STATUSES]).toEqual([
    "CREATED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "BREAKER_TRIPPED",
  ]);
  expect([...CALL_KINDS]).toEqual(["model", "tool"]);
  expect([...POLICY_REASON_CODES]).toEqual([
    "INVALID_POLICY",
    "INVALID_RUN_STATE",
    "RUN_NOT_RUNNING",
    "MAX_RUNTIME_EXCEEDED",
    "MAX_STEPS_EXCEEDED",
    "MAX_ESTIMATED_COST_EXCEEDED",
    "MAX_REPEATED_ACTION_EXCEEDED",
    "UNSUPPORTED_ACTION_ARGUMENTS",
  ]);
  expect(EVENT_TYPES).toContain("POLICY_BLOCKED");
  expect(EVENT_TYPES).toContain("BREAKER_TRIPPED");
});

test("policy exposes the four controls and cost fields are estimates", () => {
  expect(demoPolicy.maxSteps).toBe(8);
  expect(demoPolicy.maxEstimatedCostUsd).toBe(0.25);
  expect(demoPolicy.maxRuntimeMs).toBe(30_000);
  expect(demoPolicy.maxRepeatedActionCount).toBe(3);
  expect(Object.keys(demoPolicy)).toContain("maxEstimatedCostUsd");
  expect(Object.keys(demoPolicy).some((key) => key.toLowerCase() === "costusd")).toBe(false);
});
