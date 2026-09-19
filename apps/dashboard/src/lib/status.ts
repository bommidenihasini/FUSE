import type { RunStatus } from "./api";

export function statusLabel(status: RunStatus): string {
  switch (status) {
    case "BREAKER_TRIPPED":
      return "BREAKER TRIPPED";
    case "COMPLETED":
      return "RUN COMPLETED SAFELY";
    case "RUNNING":
      return "Running";
    case "FAILED":
      return "Failed";
    case "CREATED":
      return "Created";
  }
}

export function statusTone(status: RunStatus): "breaker" | "completed" | "running" | "muted" {
  switch (status) {
    case "BREAKER_TRIPPED":
    case "FAILED":
      return "breaker";
    case "COMPLETED":
      return "completed";
    case "RUNNING":
      return "running";
    default:
      return "muted";
  }
}

export function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    RUN_CREATED: "Run created",
    RUN_STARTED: "Run started",
    POLICY_EVALUATED: "Policy evaluated",
    MODEL_CALL_ALLOWED: "Model call allowed",
    MODEL_CALL_COMPLETED: "Model result recorded",
    TOOL_CALL_ALLOWED: "Tool call allowed",
    TOOL_CALL_COMPLETED: "Tool result recorded",
    TOOL_CALL_FAILED: "Tool result recorded",
    POLICY_BLOCKED: "Policy blocked",
    BREAKER_TRIPPED: "Breaker tripped",
    RUN_COMPLETED: "Run completed",
    RUN_FAILED: "Run failed",
  };
  return labels[type] ?? type;
}

export const STRICT_POLICY_ID = "policy-demo-strict";
