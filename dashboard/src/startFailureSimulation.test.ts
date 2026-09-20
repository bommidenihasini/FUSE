import { describe, expect, test, vi } from "vitest";
import { startFailureSimulation } from "./startFailureSimulation.ts";

describe("startFailureSimulation", () => {
  test("posts the loop scenario and returns the breaker envelope", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          run: {
            runId: "run-loop-1",
            status: "BREAKER_TRIPPED",
            breakerReason: "Repeated action exceeded policy maxRepeatedActionCount",
          },
          nextInvocation: "BLOCKED",
          liveBedrock: false,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await startFailureSimulation(fetchImpl);

    expect(result).toEqual({
      ok: true,
      runId: "run-loop-1",
      status: "BREAKER_TRIPPED",
      nextInvocation: "BLOCKED",
      breakerReason: "Repeated action exceeded policy maxRepeatedActionCount",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/runs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          scenario: "invoice-verification-loop",
          policyId: "policy-demo-strict",
        }),
      }),
    );
  });

  test("does not treat a network error as a successful simulation", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    const result = await startFailureSimulation(fetchImpl);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Backend unavailable");
    }
  });
});
