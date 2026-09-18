/** Canonical Fuse types. Evaluators and AWS I/O are implemented in later checkpoints. */

export const RUN_STATUSES = [
  "CREATED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "BREAKER_TRIPPED",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const EVENT_TYPES = [
  "RUN_CREATED",
  "RUN_STARTED",
  "MODEL_CALL_ALLOWED",
  "MODEL_CALL_COMPLETED",
  "TOOL_CALL_ALLOWED",
  "TOOL_CALL_COMPLETED",
  "TOOL_CALL_FAILED",
  "POLICY_EVALUATED",
  "POLICY_BLOCKED",
  "BREAKER_TRIPPED",
  "RUN_COMPLETED",
  "RUN_FAILED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const CALL_KINDS = ["model", "tool"] as const;

export type CallKind = (typeof CALL_KINDS)[number];

export const POLICY_REASON_CODES = [
  "INVALID_POLICY",
  "INVALID_RUN_STATE",
  "RUN_NOT_RUNNING",
  "MAX_RUNTIME_EXCEEDED",
  "MAX_STEPS_EXCEEDED",
  "MAX_ESTIMATED_COST_EXCEEDED",
  "MAX_REPEATED_ACTION_EXCEEDED",
  "UNSUPPORTED_ACTION_ARGUMENTS",
] as const;

export type PolicyReasonCode = (typeof POLICY_REASON_CODES)[number];

export interface Policy {
  policyId: string;
  name: string;
  maxSteps: number;
  maxEstimatedCostUsd: number;
  maxRuntimeMs: number;
  maxRepeatedActionCount: number;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  runId: string;
  scenario: string;
  status: RunStatus;
  policySnapshot: Policy;
  stepCount: number;
  modelCallCount: number;
  toolCallCount: number;
  retryCount: number;
  estimatedCostUsd: number;
  startedAt: string;
  endedAt?: string;
  breakerReason?: string;
  breakerReasonCode?: PolicyReasonCode;
}

export interface Event {
  runId: string;
  sequence: number;
  type: EventType;
  timestamp: string;
  kind?: CallKind;
  name?: string;
  stableSignature?: string;
  allowed?: boolean;
  reasonCode?: PolicyReasonCode;
  reason?: string;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
}

export interface BeforeCallInput {
  runId: string;
  kind: CallKind;
  name: string;
  arguments: unknown;
}

export interface PolicyDecision {
  allowed: boolean;
  reasonCode?: PolicyReasonCode;
  reason?: string;
  observed: {
    steps: number;
    estimatedCostUsd: number;
    elapsedMs: number;
    repeatedActionCount: number;
  };
  policy: Policy;
  stableSignature?: string;
}

export interface ToolRequest {
  name: string;
  arguments: unknown;
}

export interface ToolResult {
  name: string;
  ok: boolean;
  output: unknown;
  errorCode?: string;
}
