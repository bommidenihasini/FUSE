export type RunStatus =
  | "CREATED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "BREAKER_TRIPPED";

export interface Policy {
  policyId: string;
  name: string;
  maxSteps: number;
  maxEstimatedCostUsd: number;
  maxRuntimeMs: number;
  maxRepeatedActionCount: number;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  runId: string;
  scenario: string;
  status: RunStatus;
  policySnapshot: Policy;
  stepCount: number;
  modelCallCount: number;
  toolCallCount: number;
  retryCount: number;
  estimatedCostUsd: number;
  startedAt: string;
  endedAt?: string;
  breakerReason?: string;
  breakerReasonCode?: string;
}

export interface AuditEvent {
  runId: string;
  sequence: number;
  type: string;
  timestamp: string;
  kind?: string;
  name?: string;
  stableSignature?: string;
  allowed?: boolean;
  reasonCode?: string;
  reason?: string;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
}

export interface HealthResponse {
  ok: boolean;
  service: string;
  mode: string;
  liveBedrock: boolean;
}

export interface RunEnvelope {
  run: Run;
  estimatedCostLabel: string;
  executionMode: string;
  liveBedrock: boolean;
  syntheticDataLabel: string;
  mode: string;
  nextInvocation?: string;
}

export interface EventsEnvelope {
  runId: string;
  events: AuditEvent[];
  liveBedrock: boolean;
  mode: string;
  syntheticDataLabel: string;
}

export interface PoliciesEnvelope {
  policies: Policy[];
  syntheticDataLabel: string;
  liveBedrock: boolean;
  mode: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super("Backend unavailable");
    this.name = "BackendUnavailableError";
  }
}

function apiBase(): string {
  const configured = import.meta.env.VITE_FUSE_API_URL;
  return configured === undefined || configured === "" ? "" : configured.replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, init);
  } catch {
    throw new BackendUnavailableError();
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, "Invalid API response");
  }
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new ApiError(response.status, message);
  }
  return data as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return request("/health");
}

export async function getPolicies(): Promise<PoliciesEnvelope> {
  return request("/policies");
}

export async function getRun(runId: string): Promise<RunEnvelope> {
  return request(`/runs/${encodeURIComponent(runId)}`);
}

export async function getRunEvents(runId: string): Promise<EventsEnvelope> {
  return request(`/runs/${encodeURIComponent(runId)}/events`);
}

export async function startRun(scenario: string, policyId: string): Promise<RunEnvelope> {
  return request("/runs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ scenario, policyId }),
  });
}
