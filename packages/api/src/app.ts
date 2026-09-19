import type { Policy, Run } from "@fuse/contracts";
import { InMemoryFuseRepository, type FuseRepository } from "@fuse/persistence";
import { InvoiceVerificationRunner } from "@fuse/runner";
import { SYNTHETIC_DATA_LABEL } from "@fuse/test-fixtures";
import { getDemoPolicy, listDemoPolicies } from "./policies.js";
import {
  createRunBodySchema,
  idempotencyKeySchema,
  runIdSchema,
  type CreateRunBody,
} from "./schemas.js";
import {
  API_MODE,
  API_SERVICE,
  ESTIMATED_COST_LABEL,
  type HttpRequest,
  type HttpResponse,
} from "./types.js";

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,idempotency-key",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

export interface FuseApiOptions {
  repository?: FuseRepository;
  nowIso?: () => string;
  createId?: () => string;
}

export interface FuseApi {
  handle(request: HttpRequest): Promise<HttpResponse>;
}

function header(request: HttpRequest, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === target && value !== undefined && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function json(statusCode: number, payload: unknown): HttpResponse {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

function envelope(run: Run): Record<string, unknown> {
  const body: Record<string, unknown> = {
    run,
    estimatedCostLabel: ESTIMATED_COST_LABEL,
    executionMode: "simulation",
    liveBedrock: false,
    syntheticDataLabel: SYNTHETIC_DATA_LABEL,
    mode: API_MODE,
  };
  if (run.status === "BREAKER_TRIPPED") {
    body.nextInvocation = "BLOCKED";
  }
  return body;
}

function parsePath(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0);
}

/**
 * Smallest HTTP surface over the synthetic runner. liveBedrock is always false.
 */
export function createFuseApi(options: FuseApiOptions = {}): FuseApi {
  const nowIso = options.nowIso ?? (() => new Date().toISOString());
  const repository = options.repository ?? new InMemoryFuseRepository(options.createId);
  const idempotentRuns = new Map<string, string>();
  let busy = false;

  return {
    async handle(request: HttpRequest): Promise<HttpResponse> {
      const method = request.method.toUpperCase();
      const parts = parsePath(request.path);

      if (method === "OPTIONS") {
        return { statusCode: 204, headers: JSON_HEADERS, body: "" };
      }

      if (method === "GET" && parts.length === 1 && parts[0] === "health") {
        return json(200, {
          ok: true,
          service: API_SERVICE,
          mode: API_MODE,
          liveBedrock: false,
        });
      }

      if (method === "GET" && parts.length === 1 && parts[0] === "policies") {
        return json(200, {
          policies: listDemoPolicies(),
          syntheticDataLabel: SYNTHETIC_DATA_LABEL,
          liveBedrock: false,
          mode: API_MODE,
        });
      }

      if (method === "GET" && parts.length === 2 && parts[0] === "runs") {
        const parsedId = runIdSchema.safeParse(parts[1]);
        if (!parsedId.success) {
          return json(400, { ok: false, error: "Invalid runId" });
        }
        const run = await repository.getRun(parsedId.data);
        if (run === undefined) {
          return json(404, { ok: false, error: "Run not found" });
        }
        return json(200, envelope(run));
      }

      if (method === "GET" && parts.length === 3 && parts[0] === "runs" && parts[2] === "events") {
        const parsedId = runIdSchema.safeParse(parts[1]);
        if (!parsedId.success) {
          return json(400, { ok: false, error: "Invalid runId" });
        }
        const run = await repository.getRun(parsedId.data);
        if (run === undefined) {
          return json(404, { ok: false, error: "Run not found" });
        }
        const events = await repository.listEvents(parsedId.data);
        return json(200, {
          runId: parsedId.data,
          events,
          liveBedrock: false,
          mode: API_MODE,
          syntheticDataLabel: SYNTHETIC_DATA_LABEL,
        });
      }

      if (method === "POST" && parts.length === 1 && parts[0] === "runs") {
        return createRun(request);
      }

      return json(404, { ok: false, error: "Not found" });
    },
  };

  async function createRun(request: HttpRequest): Promise<HttpResponse> {
    const rawKey = header(request, "idempotency-key");
    const keyParsed = idempotencyKeySchema.safeParse(rawKey);
    if (!keyParsed.success) {
      return json(400, { ok: false, error: "Idempotency-Key header is required" });
    }

    const existingId = idempotentRuns.get(keyParsed.data);
    if (existingId !== undefined) {
      const existing = await repository.getRun(existingId);
      if (existing !== undefined) {
        return json(200, envelope(existing));
      }
    }

    let parsedBody: CreateRunBody;
    try {
      const raw: unknown =
        request.body === undefined || request.body.trim() === "" ? {} : JSON.parse(request.body);
      const body = createRunBodySchema.safeParse(raw);
      if (!body.success) {
        return json(400, { ok: false, error: "Invalid body. scenario and policyId are required." });
      }
      parsedBody = body.data;
    } catch {
      return json(400, { ok: false, error: "Invalid JSON" });
    }

    const policy: Policy | undefined = getDemoPolicy(parsedBody.policyId);
    if (policy === undefined) {
      return json(400, { ok: false, error: "Unknown policyId" });
    }

    if (busy) {
      return json(409, { ok: false, error: "A demo run is already in progress" });
    }

    busy = true;
    try {
      const runner = new InvoiceVerificationRunner({
        repository,
        nowIso,
        policy,
      });
      const result = await runner.run(parsedBody.scenario);
      idempotentRuns.set(keyParsed.data, result.run.runId);
      return json(201, envelope(result.run));
    } finally {
      busy = false;
    }
  }
}

export type { Policy, Run };
