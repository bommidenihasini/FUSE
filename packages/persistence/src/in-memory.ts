import { randomUUID } from "node:crypto";
import type { Event, Policy, Run } from "@fuse/contracts";
import {
  assertAllowedTransition,
  DuplicateEventError,
  DuplicateRunError,
  RunNotFoundError,
  RunNotRunningError,
} from "./errors.js";
import { assertMutable, cloneEvent, clonePolicy, publicRun, type StoredRun } from "./mapping.js";
import { sanitizeMetadata } from "./sanitize.js";
import type {
  AppendEventInput,
  CreateRunInput,
  FuseRepository,
  RunCounterPatch,
  TransitionRunInput,
} from "./types.js";

export class InMemoryFuseRepository implements FuseRepository {
  private readonly runs = new Map<string, StoredRun>();
  private readonly events = new Map<string, Event>();

  constructor(private readonly createId: () => string = randomUUID) {}

  async createRun(input: CreateRunInput): Promise<Run> {
    const runId = this.createId();
    if (this.runs.has(runId)) {
      throw new DuplicateRunError(runId);
    }
    const stored: StoredRun = {
      runId,
      scenario: input.scenario,
      status: "CREATED",
      policySnapshot: clonePolicy(input.policySnapshot),
      stepCount: 0,
      modelCallCount: 0,
      toolCallCount: 0,
      retryCount: 0,
      estimatedCostUsd: 0,
      startedAt: input.createdAt,
      nextEventSequence: 1,
    };
    this.runs.set(runId, stored);
    return publicRun(stored);
  }

  async getRun(runId: string): Promise<Run | undefined> {
    const stored = this.runs.get(runId);
    return stored === undefined ? undefined : publicRun(stored);
  }

  async getPolicySnapshot(runId: string): Promise<Policy> {
    const stored = this.require(runId);
    return clonePolicy(stored.policySnapshot);
  }

  async updateRunCounters(runId: string, counters: RunCounterPatch): Promise<Run> {
    const stored = this.require(runId);
    assertMutable(stored);
    if (stored.status !== "RUNNING") {
      throw new RunNotRunningError(runId);
    }
    stored.stepCount = counters.stepCount;
    stored.modelCallCount = counters.modelCallCount;
    stored.toolCallCount = counters.toolCallCount;
    stored.retryCount = counters.retryCount;
    stored.estimatedCostUsd = counters.estimatedCostUsd;
    return publicRun(stored);
  }

  async transitionRunState(input: TransitionRunInput): Promise<Run> {
    const stored = this.require(input.runId);
    assertAllowedTransition(stored.status, input.to);
    stored.status = input.to;
    if (input.to === "RUNNING") {
      stored.startedAt = input.at;
    } else {
      stored.endedAt = input.at;
    }
    if (input.breakerReason !== undefined) {
      stored.breakerReason = input.breakerReason;
    }
    if (input.breakerReasonCode !== undefined) {
      stored.breakerReasonCode = input.breakerReasonCode;
    }
    return publicRun(stored);
  }

  async appendEvent(runId: string, event: AppendEventInput): Promise<Event> {
    const stored = this.require(runId);
    assertMutable(stored);
    const sequence = stored.nextEventSequence;
    const key = eventKey(runId, sequence);
    if (this.events.has(key)) {
      throw new DuplicateEventError(runId, sequence);
    }
    const written = cloneEvent({
      ...event,
      runId,
      sequence,
      metadata: sanitizeMetadata(event.metadata),
    });
    this.events.set(key, written);
    stored.nextEventSequence = sequence + 1;
    return cloneEvent(written);
  }

  async listEvents(runId: string): Promise<Event[]> {
    this.require(runId);
    return [...this.events.values()]
      .filter((event) => event.runId === runId)
      .sort((a, b) => a.sequence - b.sequence)
      .map((event) => cloneEvent(event));
  }

  private require(runId: string): StoredRun {
    const stored = this.runs.get(runId);
    if (stored === undefined) {
      throw new RunNotFoundError(runId);
    }
    return stored;
  }
}

function eventKey(runId: string, sequence: number): string {
  return `${runId}#${String(sequence)}`;
}
