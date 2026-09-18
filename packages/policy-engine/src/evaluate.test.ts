import { describe, expect, test } from "vitest";
import type { Policy } from "@fuse/contracts";
import { normalizeAction } from "./normalize-action.js";
import { evaluateBeforeCall, type PolicyEvaluationInput } from "./evaluate.js";

const FIXED_ISO = "2026-09-18T18:00:00.000Z";

const policy: Policy = {
  policyId: "policy-demo-safe",
  name: "Demo safe policy",
  maxSteps: 6,
  maxEstimatedCostUsd: 0.15,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 3,
  enabled: true,
  version: 1,
  createdAt: FIXED_ISO,
  updatedAt: FIXED_ISO,
};

function baseInput(overrides: Partial<PolicyEvaluationInput> = {}): PolicyEvaluationInput {
  return {
    status: "RUNNING",
    stepCount: 1,
    estimatedCostUsd: 0.01,
    elapsedMs: 1_000,
    priorSignatures: [],
    policy,
    kind: "tool",
    name: "verify_vendor",
    arguments: { invoiceId: "INV-DEMO-001" },
    proposedEstimatedCostUsd: 0.002,
    ...overrides,
  };
}

describe("evaluateBeforeCall", () => {
  test("valid call is allowed under all thresholds", () => {
    const decision = evaluateBeforeCall(baseInput());
    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBeUndefined();
    expect(decision.stableSignature).toBe(
      normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" }),
    );
    expect(decision.observed.steps).toBe(1);
    expect(decision.observed.estimatedCostUsd).toBe(0.01);
  });

  test("non-RUNNING run is rejected", () => {
    const decision = evaluateBeforeCall(baseInput({ status: "CREATED" }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("RUN_NOT_RUNNING");
    expect(decision.reason).toContain("Next invocation blocked");
  });

  test("CREATED run is rejected", () => {
    expect(evaluateBeforeCall(baseInput({ status: "CREATED" })).reasonCode).toBe("RUN_NOT_RUNNING");
  });

  test("COMPLETED run is rejected", () => {
    expect(evaluateBeforeCall(baseInput({ status: "COMPLETED" })).reasonCode).toBe(
      "RUN_NOT_RUNNING",
    );
  });

  test("FAILED run is rejected", () => {
    expect(evaluateBeforeCall(baseInput({ status: "FAILED" })).reasonCode).toBe("RUN_NOT_RUNNING");
  });

  test("BREAKER_TRIPPED run is rejected", () => {
    expect(evaluateBeforeCall(baseInput({ status: "BREAKER_TRIPPED" })).reasonCode).toBe(
      "RUN_NOT_RUNNING",
    );
  });

  test("maximum-steps boundary: current 5, max 6 allows the next call", () => {
    const decision = evaluateBeforeCall(baseInput({ stepCount: 5, policy }));
    expect(decision.allowed).toBe(true);
  });

  test("maximum-steps violation: current 6, max 6 blocks the next call", () => {
    const decision = evaluateBeforeCall(baseInput({ stepCount: 6 }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_STEPS_EXCEEDED");
  });

  test("estimated-cost boundary: current + proposed equal to max is allowed", () => {
    const decision = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, maxEstimatedCostUsd: 0.25 },
        estimatedCostUsd: 0.125,
        proposedEstimatedCostUsd: 0.125,
      }),
    );
    expect(decision.allowed).toBe(true);
  });

  test("estimated-cost violation: current + proposed greater than max is blocked", () => {
    const decision = evaluateBeforeCall(
      baseInput({
        estimatedCostUsd: 0.1,
        proposedEstimatedCostUsd: 0.051,
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_ESTIMATED_COST_EXCEEDED");
    expect(decision.observed.estimatedCostUsd).toBe(0.1);
  });

  test("runtime boundary: elapsed equal to maxRuntimeMs is blocked", () => {
    const decision = evaluateBeforeCall(baseInput({ elapsedMs: 30_000 }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_RUNTIME_EXCEEDED");
  });

  test("runtime violation: elapsed above maxRuntimeMs is blocked", () => {
    const decision = evaluateBeforeCall(baseInput({ elapsedMs: 30_001 }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_RUNTIME_EXCEEDED");
  });

  test("repeated-action boundary: 2 prior matches + next = 3, max 3 allows", () => {
    const signature = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" });
    const decision = evaluateBeforeCall(
      baseInput({
        priorSignatures: [signature, signature],
      }),
    );
    expect(decision.allowed).toBe(true);
    expect(decision.observed.repeatedActionCount).toBe(3);
  });

  test("repeated-action violation: 3 prior matches + next = 4, max 3 blocks", () => {
    const signature = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" });
    const decision = evaluateBeforeCall(
      baseInput({
        priorSignatures: [signature, signature, signature],
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
    expect(decision.observed.repeatedActionCount).toBe(4);
  });

  test("same tool with different arguments is not treated as a duplicate", () => {
    const prior = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-002" });
    const tight = {
      ...policy,
      maxRepeatedActionCount: 1,
    };
    const decision = evaluateBeforeCall(
      baseInput({
        policy: tight,
        priorSignatures: [prior],
        arguments: { invoiceId: "INV-DEMO-001" },
      }),
    );
    expect(decision.allowed).toBe(true);
  });

  test("equivalent object arguments count as the same normalized action", () => {
    const prior = normalizeAction("verify_vendor", {
      vendor: "Northstar Supplies",
      invoiceId: "INV-DEMO-001",
    });
    const tight = { ...policy, maxRepeatedActionCount: 1 };
    const decision = evaluateBeforeCall(
      baseInput({
        policy: tight,
        priorSignatures: [prior],
        arguments: { invoiceId: "INV-DEMO-001", vendor: "Northstar Supplies" },
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
  });

  test("multiple simultaneous violations follow documented precedence (runtime first)", () => {
    const signature = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" });
    const decision = evaluateBeforeCall(
      baseInput({
        elapsedMs: 30_000,
        stepCount: 6,
        estimatedCostUsd: 0.2,
        proposedEstimatedCostUsd: 0.1,
        priorSignatures: [signature, signature, signature],
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MAX_RUNTIME_EXCEEDED");
  });

  test("negative run counters are INVALID_RUN_STATE", () => {
    const decision = evaluateBeforeCall(baseInput({ stepCount: -1 }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("INVALID_RUN_STATE");
  });

  test("invalid or negative policy values are rejected", () => {
    const negative = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, maxSteps: -1 },
      }),
    );
    expect(negative.allowed).toBe(false);
    expect(negative.reasonCode).toBe("INVALID_POLICY");
    const disabled = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, enabled: false },
      }),
    );
    expect(disabled.reasonCode).toBe("INVALID_POLICY");
  });

  test("zero thresholds behave deterministically", () => {
    const zeroSteps = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, maxSteps: 0 },
        stepCount: 0,
      }),
    );
    expect(zeroSteps.reasonCode).toBe("MAX_STEPS_EXCEEDED");
    const zeroRuntime = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, maxRuntimeMs: 0 },
        elapsedMs: 0,
      }),
    );
    expect(zeroRuntime.reasonCode).toBe("MAX_RUNTIME_EXCEEDED");
    const zeroRepeats = evaluateBeforeCall(
      baseInput({
        policy: { ...policy, maxRepeatedActionCount: 0 },
      }),
    );
    expect(zeroRepeats.reasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
  });

  test("input objects are not mutated", () => {
    const priorSignatures = [normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-002" })];
    const args = { invoiceId: "INV-DEMO-001", nested: { b: 1, a: 2 } };
    const input = baseInput({
      priorSignatures,
      arguments: args,
      policy: { ...policy },
    });
    const before = JSON.stringify(input);
    evaluateBeforeCall(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(priorSignatures).toHaveLength(1);
    expect(args.nested).toEqual({ b: 1, a: 2 });
  });

  test("unsupported action arguments are blocked honestly", () => {
    const decision = evaluateBeforeCall(
      baseInput({
        arguments: { invoiceId: "INV-DEMO-001", when: new Date("2026-09-18T00:00:00.000Z") },
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("UNSUPPORTED_ACTION_ARGUMENTS");
    expect(decision.reason).toContain("Next invocation blocked");
  });

  test("repeated calls produce the same decision for the same inputs", () => {
    const input = baseInput({ stepCount: 4 });
    const first = evaluateBeforeCall(input);
    const second = evaluateBeforeCall(input);
    expect(first).toEqual(second);
  });
});
