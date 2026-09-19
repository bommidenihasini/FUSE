import type { Event, Policy, Run } from "@fuse/contracts";
import type { FuseRepository } from "@fuse/persistence";
import type { ScenarioId, SyntheticInvoice } from "@fuse/test-fixtures";

export const SIMULATED_MODEL_NAME = "simulate_invoice_planner" as const;
export const VERIFY_VENDOR_TOOL = "verify_vendor" as const;
export const HARD_RUNNER_SAFETY_CAP = 32;
export const DEFAULT_RUNNER_SAFETY_CAP = 16;
export const ESTIMATED_CALL_COST_USD = 0.01;

export type ExecutionMode = "simulation";

export type Observation = "none" | "ambiguous" | "verified" | "tool_error";

export type ModelPlan =
  { action: "call_tool"; name: typeof VERIFY_VENDOR_TOOL } | { action: "complete" };

export interface VendorVerification {
  status: Exclude<Observation, "none" | "tool_error">;
  invoiceId: SyntheticInvoice["invoiceId"];
}

export interface RunnerResult {
  run: Run;
  events: Event[];
  modelExecutions: number;
  toolExecutions: number;
  executionMode: ExecutionMode;
  liveBedrock: false;
  syntheticDataLabel: "Synthetic demo data";
}

export interface InvoiceVerificationRunnerOptions {
  repository: FuseRepository;
  nowIso: () => string;
  policy?: Policy;
  /**
   * Hard iteration cap. Clamped to HARD_RUNNER_SAFETY_CAP. Independent of policy.
   */
  safetyCap?: number;
}

export type { ScenarioId };
