import { describe, expect, test } from "vitest";
import { getScenarioFixture } from "@fuse/test-fixtures";
import { InvalidActionNameError, normalizeAction } from "./normalize-action.js";

describe("normalizeAction", () => {
  test("includes tool name and stable serialized arguments", () => {
    const signature = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" });
    expect(signature.startsWith("verify_vendor:")).toBe(true);
    expect(signature).toBe('verify_vendor:{"invoiceId":"INV-DEMO-001"}');
  });

  test("same tool with equivalent object arguments matches despite key order", () => {
    const a = normalizeAction("verify_vendor", {
      invoiceId: "INV-DEMO-001",
      vendor: "Northstar Supplies",
    });
    const b = normalizeAction("verify_vendor", {
      vendor: "Northstar Supplies",
      invoiceId: "INV-DEMO-001",
    });
    expect(a).toBe(b);
  });

  test("different argument values produce different signatures", () => {
    const a = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-001" });
    const b = normalizeAction("verify_vendor", { invoiceId: "INV-DEMO-002" });
    expect(a).not.toBe(b);
  });

  test("different tool names with identical arguments produce different signatures", () => {
    const args = { invoiceId: "INV-DEMO-001" };
    expect(normalizeAction("verify_vendor", args)).not.toBe(normalizeAction("charge_vendor", args));
  });

  test("null arguments are represented explicitly", () => {
    expect(normalizeAction("verify_vendor", null)).toBe("verify_vendor:null");
  });

  test("invalid names are rejected", () => {
    expect(() => normalizeAction("", { invoiceId: "INV-DEMO-001" })).toThrow(
      InvalidActionNameError,
    );
    expect(() => normalizeAction("   ", { invoiceId: "INV-DEMO-001" })).toThrow(
      InvalidActionNameError,
    );
  });

  test("signatures are stable across repeated calls", () => {
    const fixture = getScenarioFixture("invoice-verification-loop");
    const args = { invoiceId: fixture.invoice.invoiceId, amount: fixture.invoice.amount };
    expect(normalizeAction("verify_vendor", args)).toBe(normalizeAction("verify_vendor", args));
  });

  test("does not put prompt or secret values into the signature", () => {
    const signature = normalizeAction("bedrock.converse", {
      invoiceId: "INV-DEMO-001",
      prompt: "full live prompt text that must not be stored",
      apiKey: "secret-demo-key",
    });
    expect(signature).not.toContain("full live prompt");
    expect(signature).not.toContain("secret-demo-key");
    expect(signature).toContain("<redacted>");
    expect(signature).toContain("INV-DEMO-001");
  });

  test("bounded fixture invoices produce distinct signatures", () => {
    const loop = getScenarioFixture("invoice-verification-loop");
    const safe = getScenarioFixture("safe-completion");
    const error = getScenarioFixture("bounded-tool-error");
    const signatures = [loop, safe, error].map((fixture) =>
      normalizeAction("verify_vendor", {
        invoiceId: fixture.invoice.invoiceId,
        vendor: fixture.invoice.vendor,
        amount: fixture.invoice.amount,
      }),
    );
    expect(new Set(signatures).size).toBe(3);
  });
});
