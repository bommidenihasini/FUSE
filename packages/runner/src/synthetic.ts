import type { Policy } from "@fuse/contracts";
import {
  getScenarioFixture,
  SCENARIO_IDS,
  type ScenarioId,
  type SyntheticInvoice,
} from "@fuse/test-fixtures";
import { SyntheticToolError } from "./errors.js";
import type { ModelPlan, Observation, VendorVerification } from "./types.js";
import { VERIFY_VENDOR_TOOL } from "./types.js";

export function isScenarioId(value: string): value is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(value);
}

export function copyInvoice(invoice: SyntheticInvoice): SyntheticInvoice {
  return {
    invoiceId: invoice.invoiceId,
    vendor: invoice.vendor,
    amount: invoice.amount,
  };
}

export function copyPolicy(policy: Policy): Policy {
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

export function defaultDemoPolicy(at: string): Policy {
  return {
    policyId: "policy-demo-runner",
    name: "Demo runner policy",
    maxSteps: 8,
    maxEstimatedCostUsd: 1,
    maxRuntimeMs: 30_000,
    maxRepeatedActionCount: 3,
    enabled: true,
    version: 1,
    createdAt: at,
    updatedAt: at,
  };
}

export function planNextAction(observation: Observation): ModelPlan {
  if (observation === "verified") {
    return { action: "complete" };
  }
  return { action: "call_tool", name: VERIFY_VENDOR_TOOL };
}

/**
 * Allowlisted synthetic verify_vendor only. Never fetches URLs or runs arbitrary tools.
 */
export function executeVerifyVendor(invoice: SyntheticInvoice): VendorVerification {
  const fixture = getScenarioFixture(
    invoice.invoiceId === "INV-DEMO-001"
      ? "invoice-verification-loop"
      : invoice.invoiceId === "INV-DEMO-002"
        ? "safe-completion"
        : "bounded-tool-error",
  );
  if (fixture.expectedToolBehavior === "tool_error") {
    throw new SyntheticToolError("tool_error");
  }
  if (fixture.expectedToolBehavior === "ambiguous") {
    return { status: "ambiguous", invoiceId: invoice.invoiceId };
  }
  return { status: "verified", invoiceId: invoice.invoiceId };
}
