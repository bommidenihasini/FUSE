import type { Policy } from "@fuse/contracts";
import { copyPolicy } from "@fuse/runner";

const FIXED = "2026-09-18T18:00:00.000Z";

const strict: Policy = {
  policyId: "policy-demo-strict",
  name: "Demo strict policy",
  maxSteps: 8,
  maxEstimatedCostUsd: 1,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 3,
  enabled: true,
  version: 1,
  createdAt: FIXED,
  updatedAt: FIXED,
};

const lenient: Policy = {
  policyId: "policy-demo-lenient",
  name: "Demo lenient policy",
  maxSteps: 8,
  maxEstimatedCostUsd: 1,
  maxRuntimeMs: 30_000,
  maxRepeatedActionCount: 8,
  enabled: true,
  version: 1,
  createdAt: FIXED,
  updatedAt: FIXED,
};

export const DEMO_POLICIES: readonly Policy[] = Object.freeze([
  Object.freeze(copyPolicy(strict)),
  Object.freeze(copyPolicy(lenient)),
]);

export function getDemoPolicy(policyId: string): Policy | undefined {
  const found = DEMO_POLICIES.find((policy) => policy.policyId === policyId);
  return found === undefined ? undefined : copyPolicy(found);
}

export function listDemoPolicies(): Policy[] {
  return DEMO_POLICIES.map((policy) => copyPolicy(policy));
}
