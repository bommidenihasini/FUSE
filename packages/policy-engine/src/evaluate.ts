import {
  CALL_KINDS,
  RUN_STATUSES,
  type CallKind,
  type Policy,
  type PolicyDecision,
  type PolicyReasonCode,
  type RunStatus,
} from "@fuse/contracts";
import { InvalidActionNameError, normalizeAction } from "./normalize-action.js";
import { UnsupportedSignatureValueError } from "./stable-stringify.js";

export interface PolicyEvaluationInput {
  status: RunStatus;
  stepCount: number;
  estimatedCostUsd: number;
  elapsedMs: number;
  priorSignatures: readonly string[];
  policy: Policy;
  kind: CallKind;
  name: string;
  arguments: unknown;
  proposedEstimatedCostUsd: number;
}

const BLOCK_PREFIX = "Next invocation blocked";

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function snapshotPolicy(policy: Policy): Policy {
  return {
    policyId: policy.policyId,
    name: policy.name,
    maxSteps: policy.maxSteps,
    maxEstimatedCostUsd: policy.maxEstimatedCostUsd,
    maxRuntimeMs: policy.maxRuntimeMs,
    maxRepeatedActionCount: policy.maxRepeatedActionCount,
    enabled: policy.enabled,
    version: policy.version,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

function isValidPolicy(policy: Policy): boolean {
  return (
    policy.enabled === true &&
    isNonNegativeInteger(policy.maxSteps) &&
    isNonNegativeInteger(policy.maxRepeatedActionCount) &&
    isNonNegativeFinite(policy.maxRuntimeMs) &&
    isNonNegativeFinite(policy.maxEstimatedCostUsd) &&
    isNonNegativeInteger(policy.version)
  );
}

function isValidRunCounters(input: PolicyEvaluationInput): boolean {
  return (
    RUN_STATUSES.includes(input.status) &&
    CALL_KINDS.includes(input.kind) &&
    isNonNegativeInteger(input.stepCount) &&
    isNonNegativeFinite(input.estimatedCostUsd) &&
    isNonNegativeFinite(input.elapsedMs) &&
    isNonNegativeFinite(input.proposedEstimatedCostUsd) &&
    Array.isArray(input.priorSignatures)
  );
}

function observedFrom(
  input: PolicyEvaluationInput,
  repeatedActionCount: number,
): PolicyDecision["observed"] {
  return {
    steps: input.stepCount,
    estimatedCostUsd: input.estimatedCostUsd,
    elapsedMs: input.elapsedMs,
    repeatedActionCount,
  };
}

function decision(
  input: PolicyEvaluationInput,
  allowed: boolean,
  repeatedActionCount: number,
  extras: {
    reasonCode?: PolicyReasonCode;
    reason?: string;
    stableSignature?: string;
  },
): PolicyDecision {
  const result: PolicyDecision = {
    allowed,
    observed: observedFrom(input, repeatedActionCount),
    policy: snapshotPolicy(input.policy),
  };
  if (extras.reasonCode !== undefined) {
    result.reasonCode = extras.reasonCode;
  }
  if (extras.reason !== undefined) {
    result.reason = extras.reason;
  }
  if (extras.stableSignature !== undefined) {
    result.stableSignature = extras.stableSignature;
  }
  return result;
}

function deny(
  input: PolicyEvaluationInput,
  reasonCode: PolicyReasonCode,
  reason: string,
  repeatedActionCount: number,
  stableSignature?: string,
): PolicyDecision {
  return decision(input, false, repeatedActionCount, {
    reasonCode,
    reason,
    stableSignature,
  });
}

/**
 * Pure pre-call evaluator. Does not read the clock, AWS, or mutate inputs.
 *
 * Precedence: INVALID_POLICY → INVALID_RUN_STATE → RUN_NOT_RUNNING →
 * MAX_RUNTIME_EXCEEDED → MAX_STEPS_EXCEEDED → MAX_ESTIMATED_COST_EXCEEDED →
 * MAX_REPEATED_ACTION_EXCEEDED (or UNSUPPORTED_ACTION_ARGUMENTS if the next
 * signature cannot be computed).
 */
export function evaluateBeforeCall(input: PolicyEvaluationInput): PolicyDecision {
  if (!isValidPolicy(input.policy)) {
    return deny(input, "INVALID_POLICY", `${BLOCK_PREFIX}: policy is invalid or disabled`, 0);
  }
  if (!isValidRunCounters(input)) {
    return deny(
      input,
      "INVALID_RUN_STATE",
      `${BLOCK_PREFIX}: run counters or call input are invalid`,
      0,
    );
  }
  if (input.status !== "RUNNING") {
    return deny(input, "RUN_NOT_RUNNING", `${BLOCK_PREFIX}: run status is ${input.status}`, 0);
  }
  if (input.elapsedMs >= input.policy.maxRuntimeMs) {
    return deny(
      input,
      "MAX_RUNTIME_EXCEEDED",
      `${BLOCK_PREFIX}: elapsed runtime is at or above the limit`,
      0,
    );
  }
  if (input.stepCount + 1 > input.policy.maxSteps) {
    return deny(
      input,
      "MAX_STEPS_EXCEEDED",
      `${BLOCK_PREFIX}: the next step would exceed maxSteps`,
      0,
    );
  }
  if (input.estimatedCostUsd + input.proposedEstimatedCostUsd > input.policy.maxEstimatedCostUsd) {
    return deny(
      input,
      "MAX_ESTIMATED_COST_EXCEEDED",
      `${BLOCK_PREFIX}: estimated cost would exceed the limit`,
      0,
    );
  }

  let stableSignature: string;
  try {
    stableSignature = normalizeAction(input.name, input.arguments);
  } catch (error) {
    if (
      error instanceof UnsupportedSignatureValueError ||
      error instanceof InvalidActionNameError
    ) {
      return deny(
        input,
        "UNSUPPORTED_ACTION_ARGUMENTS",
        `${BLOCK_PREFIX}: action arguments cannot be normalized`,
        0,
      );
    }
    throw error;
  }

  let matchingPrior = 0;
  for (const signature of input.priorSignatures) {
    if (signature === stableSignature) {
      matchingPrior += 1;
    }
  }
  const repeatedActionCount = matchingPrior + 1;
  if (repeatedActionCount > input.policy.maxRepeatedActionCount) {
    return deny(
      input,
      "MAX_REPEATED_ACTION_EXCEEDED",
      `${BLOCK_PREFIX}: repeated normalized action`,
      repeatedActionCount,
      stableSignature,
    );
  }

  return decision(input, true, repeatedActionCount, { stableSignature });
}
