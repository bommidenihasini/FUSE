import type { Event, Policy, Run, RunStatus } from "@fuse/contracts";

export interface CreateRunInput {
  scenario: string;
  policySnapshot: Policy;
  createdAt: string;
}

export interface RunCounterPatch {
  stepCount: number;
  modelCallCount: number;
  toolCallCount: number;
  retryCount: number;
  estimatedCostUsd: number;
}

export interface TransitionRunInput {
  runId: string;
  to: RunStatus;
  at: string;
  breakerReason?: string;
  breakerReasonCode?: Run["breakerReasonCode"];
}

export type AppendEventInput = Omit<Event, "runId" | "sequence">;

export interface FuseRepository {
  createRun(input: CreateRunInput): Promise<Run>;
  getRun(runId: string): Promise<Run | undefined>;
  getPolicySnapshot(runId: string): Promise<Policy>;
  updateRunCounters(runId: string, counters: RunCounterPatch): Promise<Run>;
  transitionRunState(input: TransitionRunInput): Promise<Run>;
  appendEvent(runId: string, event: AppendEventInput): Promise<Event>;
  listEvents(runId: string): Promise<Event[]>;
}
