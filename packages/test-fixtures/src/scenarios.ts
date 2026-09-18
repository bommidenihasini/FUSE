import type { PolicyReasonCode, RunStatus } from "@fuse/contracts";

export const SYNTHETIC_DATA_LABEL = "Synthetic demo data" as const;

export const SCENARIO_IDS = [
  "invoice-verification-loop",
  "safe-completion",
  "bounded-tool-error",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type ToolBehavior = "ambiguous" | "verified" | "tool_error";

export type ExpectedPolicyOutcome =
  "BLOCK_NEXT_REPEATED_ACTION" | "ALLOW_SAFE_COMPLETION" | "BLOCK_NEXT_AFTER_REPEATED_TOOL_ERROR";

export interface SyntheticInvoice {
  invoiceId: "INV-DEMO-001" | "INV-DEMO-002" | "INV-DEMO-003";
  vendor: "Northstar Supplies" | "Harbor Office Co" | "Orchid Logistics";
  amount: number;
}

export interface ScenarioFixture {
  scenarioId: ScenarioId;
  syntheticDataLabel: typeof SYNTHETIC_DATA_LABEL;
  invoice: SyntheticInvoice;
  expectedToolBehavior: ToolBehavior;
  expectedTerminalBehavior: Extract<RunStatus, "COMPLETED" | "BREAKER_TRIPPED">;
  expectedPolicyOutcome: ExpectedPolicyOutcome;
  expectedReasonCode?: PolicyReasonCode;
  /**
   * Fixture intent only. This is not a recorded DynamoDB/Bedrock run result.
   */
  runtimeExecuted: false;
}

const loop = Object.freeze({
  scenarioId: "invoice-verification-loop",
  syntheticDataLabel: SYNTHETIC_DATA_LABEL,
  invoice: Object.freeze({
    invoiceId: "INV-DEMO-001",
    vendor: "Northstar Supplies",
    amount: 1840.5,
  }),
  expectedToolBehavior: "ambiguous",
  expectedTerminalBehavior: "BREAKER_TRIPPED",
  expectedPolicyOutcome: "BLOCK_NEXT_REPEATED_ACTION",
  expectedReasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
  runtimeExecuted: false,
}) satisfies ScenarioFixture;

const safe = Object.freeze({
  scenarioId: "safe-completion",
  syntheticDataLabel: SYNTHETIC_DATA_LABEL,
  invoice: Object.freeze({
    invoiceId: "INV-DEMO-002",
    vendor: "Harbor Office Co",
    amount: 420.0,
  }),
  expectedToolBehavior: "verified",
  expectedTerminalBehavior: "COMPLETED",
  expectedPolicyOutcome: "ALLOW_SAFE_COMPLETION",
  runtimeExecuted: false,
}) satisfies ScenarioFixture;

const toolError = Object.freeze({
  scenarioId: "bounded-tool-error",
  syntheticDataLabel: SYNTHETIC_DATA_LABEL,
  invoice: Object.freeze({
    invoiceId: "INV-DEMO-003",
    vendor: "Orchid Logistics",
    amount: 930.25,
  }),
  expectedToolBehavior: "tool_error",
  expectedTerminalBehavior: "BREAKER_TRIPPED",
  expectedPolicyOutcome: "BLOCK_NEXT_AFTER_REPEATED_TOOL_ERROR",
  expectedReasonCode: "MAX_REPEATED_ACTION_EXCEEDED",
  runtimeExecuted: false,
}) satisfies ScenarioFixture;

export const SCENARIO_FIXTURES: Record<ScenarioId, ScenarioFixture> = Object.freeze({
  "invoice-verification-loop": loop,
  "safe-completion": safe,
  "bounded-tool-error": toolError,
});

export function listScenarioFixtures(): readonly ScenarioFixture[] {
  return SCENARIO_IDS.map((id) => SCENARIO_FIXTURES[id]);
}

export function getScenarioFixture(scenarioId: ScenarioId): ScenarioFixture {
  return SCENARIO_FIXTURES[scenarioId];
}
