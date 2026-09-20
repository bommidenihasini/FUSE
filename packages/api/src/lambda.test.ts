import { describe, expect, test } from "vitest";
import { InMemoryFuseRepository } from "@fuse/persistence";
import { createFuseApi } from "./app.js";
import { createLambdaHandler } from "./lambda.js";

describe("API Gateway HTTP API Lambda adapter", () => {
  test("maps GET /health to the synthetic fuse-api contract", async () => {
    const handler = createLambdaHandler(createFuseApi());
    const result = await handler({
      rawPath: "/health",
      requestContext: { http: { method: "GET", path: "/health" } },
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      ok: true,
      service: "fuse-api",
      mode: "synthetic",
      liveBedrock: false,
    });
  });

  test("maps POST /runs and does not execute a live Bedrock call", async () => {
    let n = 0;
    const repository = new InMemoryFuseRepository(() => `run-lambda-${String((n += 1))}`);
    const handler = createLambdaHandler(
      createFuseApi({
        repository,
        nowIso: () => "2026-09-18T18:00:00.000Z",
      }),
    );
    const result = await handler({
      rawPath: "/runs",
      headers: { "content-type": "application/json", "Idempotency-Key": "idem-lambda-safe" },
      body: JSON.stringify({ scenario: "safe-completion", policyId: "policy-demo-strict" }),
      requestContext: { http: { method: "POST", path: "/runs" } },
    });
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body) as {
      liveBedrock: boolean;
      executionMode: string;
      run: { status: string };
    };
    expect(body.liveBedrock).toBe(false);
    expect(body.executionMode).toBe("simulation");
    expect(body.run.status).toBe("COMPLETED");
  });
});
