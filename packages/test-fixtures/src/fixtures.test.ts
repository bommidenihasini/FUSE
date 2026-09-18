import { describe, expect, test } from "vitest";
import {
  getScenarioFixture,
  listScenarioFixtures,
  SCENARIO_FIXTURES,
  SCENARIO_IDS,
  SYNTHETIC_DATA_LABEL,
} from "./index.js";

const FICTIONAL_VENDORS = ["Northstar Supplies", "Harbor Office Co", "Orchid Logistics"] as const;

describe("synthetic scenario fixtures", () => {
  test("all three scenarios load correctly", () => {
    expect([...SCENARIO_IDS]).toEqual([
      "invoice-verification-loop",
      "safe-completion",
      "bounded-tool-error",
    ]);
    expect(listScenarioFixtures()).toHaveLength(3);
    for (const id of SCENARIO_IDS) {
      const fixture = getScenarioFixture(id);
      expect(fixture.scenarioId).toBe(id);
      expect(fixture.syntheticDataLabel).toBe(SYNTHETIC_DATA_LABEL);
      expect(fixture.syntheticDataLabel).toBe("Synthetic demo data");
    }
  });

  test("INV-DEMO-001 is the ambiguous looping case", () => {
    const fixture = getScenarioFixture("invoice-verification-loop");
    expect(fixture.invoice.invoiceId).toBe("INV-DEMO-001");
    expect(fixture.expectedToolBehavior).toBe("ambiguous");
    expect(fixture.expectedTerminalBehavior).toBe("BREAKER_TRIPPED");
    expect(fixture.expectedPolicyOutcome).toBe("BLOCK_NEXT_REPEATED_ACTION");
    expect(fixture.expectedReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");
  });

  test("INV-DEMO-002 is safe completion", () => {
    const fixture = getScenarioFixture("safe-completion");
    expect(fixture.invoice.invoiceId).toBe("INV-DEMO-002");
    expect(fixture.expectedToolBehavior).toBe("verified");
    expect(fixture.expectedTerminalBehavior).toBe("COMPLETED");
    expect(fixture.expectedPolicyOutcome).toBe("ALLOW_SAFE_COMPLETION");
  });

  test("INV-DEMO-003 is a bounded tool error", () => {
    const fixture = getScenarioFixture("bounded-tool-error");
    expect(fixture.invoice.invoiceId).toBe("INV-DEMO-003");
    expect(fixture.expectedToolBehavior).toBe("tool_error");
    expect(fixture.expectedTerminalBehavior).toBe("BREAKER_TRIPPED");
    expect(fixture.expectedPolicyOutcome).toBe("BLOCK_NEXT_AFTER_REPEATED_TOOL_ERROR");
  });

  test("fixtures are deterministic", () => {
    const first = JSON.stringify(listScenarioFixtures());
    const second = JSON.stringify(listScenarioFixtures());
    expect(first).toBe(second);
    expect(getScenarioFixture("invoice-verification-loop")).toBe(
      SCENARIO_FIXTURES["invoice-verification-loop"],
    );
  });

  test("no real personal, financial, vendor, or customer data is used", () => {
    for (const fixture of listScenarioFixtures()) {
      expect(fixture.invoice.invoiceId.startsWith("INV-DEMO-")).toBe(true);
      expect(FICTIONAL_VENDORS).toContain(fixture.invoice.vendor);
      expect(fixture.syntheticDataLabel).toBe("Synthetic demo data");
    }
  });

  test("expected outcome is fixture intent, not a runtime result", () => {
    for (const fixture of listScenarioFixtures()) {
      expect(fixture.runtimeExecuted).toBe(false);
      expect(Object.hasOwn(fixture, "runId")).toBe(false);
      expect(Object.hasOwn(fixture, "actualStatus")).toBe(false);
    }
  });
});
