import { describe, expect, test } from "vitest";
import { eventLabel, statusLabel, statusTone } from "./status";

describe("status mapping", () => {
  test("breaker copy is Next invocation blocked language via status label", () => {
    expect(statusLabel("BREAKER_TRIPPED")).toBe("BREAKER TRIPPED");
    expect(statusTone("BREAKER_TRIPPED")).toBe("breaker");
    expect(statusLabel("COMPLETED")).toBe("RUN COMPLETED SAFELY");
  });

  test("timeline labels cover policy block and trip", () => {
    expect(eventLabel("POLICY_BLOCKED")).toBe("Policy blocked");
    expect(eventLabel("BREAKER_TRIPPED")).toBe("Breaker tripped");
  });
});
