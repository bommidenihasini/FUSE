import { InMemoryFuseRepository } from "@fuse/persistence";
import { DEMO_POLICIES } from "./policies.js";
import { createFuseApi } from "./app.js";
import { describe, expect, test } from "vitest";

function clock(): () => string {
  let n = 0;
  const start = Date.parse("2026-09-18T18:00:00.000Z");
  return () => new Date(start + n++ * 1000).toISOString();
}

function api() {
  let n = 0;
  const repository = new InMemoryFuseRepository(() => `run-api-${String((n += 1))}`);
  return createFuseApi({ repository, nowIso: clock(), createId: () => `unused` });
}

describe("Fuse HTTP API", () => {
  test("GET /health reports synthetic mode and liveBedrock false", async () => {
    const response = await api().handle({ method: "GET", path: "/health", headers: {} });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true,
      service: "fuse-api",
      mode: "synthetic",
      liveBedrock: false,
    });
  });

  test("GET /policies returns demo policies without mutating the catalog", async () => {
    const before = JSON.stringify(DEMO_POLICIES);
    const response = await api().handle({ method: "GET", path: "/policies", headers: {} });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      policies: { policyId: string }[];
      liveBedrock: boolean;
    };
    expect(body.liveBedrock).toBe(false);
    expect(body.policies.map((policy) => policy.policyId)).toEqual([
      "policy-demo-strict",
      "policy-demo-lenient",
    ]);
    body.policies[0]!.policyId = "mutated";
    expect(JSON.stringify(DEMO_POLICIES)).toBe(before);
  });

  test("POST /runs starts safe-completion and GET returns COMPLETED", async () => {
    const client = api();
    const created = await client.handle({
      method: "POST",
      path: "/runs",
      headers: { "idempotency-key": "idem-safe-0001" },
      body: JSON.stringify({ scenario: "safe-completion", policyId: "policy-demo-strict" }),
    });
    expect(created.statusCode).toBe(201);
    const createdBody = JSON.parse(created.body) as {
      run: { runId: string; status: string; scenario: string };
      liveBedrock: boolean;
      estimatedCostLabel: string;
      syntheticDataLabel: string;
    };
    expect(createdBody.liveBedrock).toBe(false);
    expect(createdBody.estimatedCostLabel).toBe("Estimated run cost");
    expect(createdBody.syntheticDataLabel).toBe("Synthetic demo data");
    expect(createdBody.run.status).toBe("COMPLETED");
    expect(createdBody.run.scenario).toBe("safe-completion");

    const loaded = await client.handle({
      method: "GET",
      path: `/runs/${createdBody.run.runId}`,
      headers: {},
    });
    expect(loaded.statusCode).toBe(200);
    expect(JSON.parse(loaded.body).run.status).toBe("COMPLETED");
  });

  test("loop scenario trips the breaker and timeline is ordered", async () => {
    const client = api();
    const created = await client.handle({
      method: "POST",
      path: "/runs",
      headers: { "Idempotency-Key": "idem-loop-0001" },
      body: JSON.stringify({
        scenario: "invoice-verification-loop",
        policyId: "policy-demo-strict",
      }),
    });
    expect(created.statusCode).toBe(201);
    const body = JSON.parse(created.body) as {
      run: { runId: string; status: string; breakerReasonCode: string };
      nextInvocation: string;
      liveBedrock: boolean;
    };
    expect(body.liveBedrock).toBe(false);
    expect(body.run.status).toBe("BREAKER_TRIPPED");
    expect(body.nextInvocation).toBe("BLOCKED");
    expect(body.run.breakerReasonCode).toBe("MAX_REPEATED_ACTION_EXCEEDED");

    const events = await client.handle({
      method: "GET",
      path: `/runs/${body.run.runId}/events`,
      headers: {},
    });
    expect(events.statusCode).toBe(200);
    const eventBody = JSON.parse(events.body) as { events: { sequence: number; type: string }[] };
    const sequences = eventBody.events.map((event) => event.sequence);
    expect(sequences).toEqual(sequences.map((_, index) => index + 1));
    expect(eventBody.events.map((event) => event.type)).toContain("POLICY_BLOCKED");
    expect(eventBody.events.map((event) => event.type)).toContain("BREAKER_TRIPPED");
  });

  test("bounded-tool-error is an allowlisted scenario", async () => {
    const created = await api().handle({
      method: "POST",
      path: "/runs",
      headers: { "idempotency-key": "idem-error-0001" },
      body: JSON.stringify({
        scenario: "bounded-tool-error",
        policyId: "policy-demo-strict",
      }),
    });
    expect(created.statusCode).toBe(201);
    expect(JSON.parse(created.body).run.status).toBe("BREAKER_TRIPPED");
  });

  test("unknown scenario and missing idempotency are rejected", async () => {
    const client = api();
    const noKey = await client.handle({
      method: "POST",
      path: "/runs",
      headers: {},
      body: JSON.stringify({ scenario: "safe-completion", policyId: "policy-demo-strict" }),
    });
    expect(noKey.statusCode).toBe(400);

    const badScenario = await client.handle({
      method: "POST",
      path: "/runs",
      headers: { "idempotency-key": "idem-bad-0001" },
      body: JSON.stringify({ scenario: "arbitrary-agent", policyId: "policy-demo-strict" }),
    });
    expect(badScenario.statusCode).toBe(400);

    const missing = await client.handle({
      method: "GET",
      path: "/runs/does-not-exist",
      headers: {},
    });
    expect(missing.statusCode).toBe(404);
  });

  test("idempotency key returns the same run without a second execution", async () => {
    const client = api();
    const first = await client.handle({
      method: "POST",
      path: "/runs",
      headers: { "idempotency-key": "idem-same-0001" },
      body: JSON.stringify({ scenario: "safe-completion", policyId: "policy-demo-strict" }),
    });
    const second = await client.handle({
      method: "POST",
      path: "/runs",
      headers: { "idempotency-key": "idem-same-0001" },
      body: JSON.stringify({ scenario: "safe-completion", policyId: "policy-demo-strict" }),
    });
    expect(JSON.parse(first.body).run.runId).toBe(JSON.parse(second.body).run.runId);
    expect(second.statusCode).toBe(200);
  });
});
