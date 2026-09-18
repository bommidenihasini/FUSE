import type { Event, Policy, Run } from "@fuse/contracts";
import { isTerminalStatus, TerminalRunError } from "./errors.js";

export interface StoredRun extends Run {
  nextEventSequence: number;
}

export function publicRun(stored: StoredRun): Run {
  const run: Run = {
    runId: stored.runId,
    scenario: stored.scenario,
    status: stored.status,
    policySnapshot: clonePolicy(stored.policySnapshot),
    stepCount: stored.stepCount,
    modelCallCount: stored.modelCallCount,
    toolCallCount: stored.toolCallCount,
    retryCount: stored.retryCount,
    estimatedCostUsd: stored.estimatedCostUsd,
    startedAt: stored.startedAt,
  };
  if (stored.endedAt !== undefined) {
    run.endedAt = stored.endedAt;
  }
  if (stored.breakerReason !== undefined) {
    run.breakerReason = stored.breakerReason;
  }
  if (stored.breakerReasonCode !== undefined) {
    run.breakerReasonCode = stored.breakerReasonCode;
  }
  return run;
}

export function clonePolicy(policy: Policy): Policy {
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

export function cloneEvent(event: Event): Event {
  const copy: Event = {
    runId: event.runId,
    sequence: event.sequence,
    type: event.type,
    timestamp: event.timestamp,
  };
  if (event.kind !== undefined) {
    copy.kind = event.kind;
  }
  if (event.name !== undefined) {
    copy.name = event.name;
  }
  if (event.stableSignature !== undefined) {
    copy.stableSignature = event.stableSignature;
  }
  if (event.allowed !== undefined) {
    copy.allowed = event.allowed;
  }
  if (event.reasonCode !== undefined) {
    copy.reasonCode = event.reasonCode;
  }
  if (event.reason !== undefined) {
    copy.reason = event.reason;
  }
  if (event.estimatedCostUsd !== undefined) {
    copy.estimatedCostUsd = event.estimatedCostUsd;
  }
  if (event.metadata !== undefined) {
    copy.metadata = { ...event.metadata };
  }
  return copy;
}

export function assertMutable(stored: StoredRun): void {
  if (isTerminalStatus(stored.status)) {
    throw new TerminalRunError(stored.runId);
  }
}
