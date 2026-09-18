import type { RunStatus } from "@fuse/contracts";

const ALLOWED: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
  CREATED: ["RUNNING"],
  RUNNING: ["COMPLETED", "FAILED", "BREAKER_TRIPPED"],
  COMPLETED: [],
  FAILED: [],
  BREAKER_TRIPPED: [],
};

export const TERMINAL_STATUSES: readonly RunStatus[] = ["COMPLETED", "FAILED", "BREAKER_TRIPPED"];

export function isTerminalStatus(status: RunStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isAllowedTransition(from: RunStatus, to: RunStatus): boolean {
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertAllowedTransition(from: RunStatus, to: RunStatus): void {
  if (!isAllowedTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_TRANSITION" as const;

  constructor(
    readonly from: RunStatus,
    readonly to: RunStatus,
  ) {
    super(`Invalid run transition ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class RunNotFoundError extends Error {
  readonly code = "RUN_NOT_FOUND" as const;

  constructor(readonly runId: string) {
    super(`Run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}

export class TerminalRunError extends Error {
  readonly code = "TERMINAL_RUN" as const;

  constructor(readonly runId: string) {
    super(`Run is terminal and immutable: ${runId}`);
    this.name = "TerminalRunError";
  }
}

export class DuplicateEventError extends Error {
  readonly code = "DUPLICATE_EVENT" as const;

  constructor(
    readonly runId: string,
    readonly sequence: number,
  ) {
    super(`Duplicate event sequence ${sequence} for run ${runId}`);
    this.name = "DuplicateEventError";
  }
}

export class DuplicateRunError extends Error {
  readonly code = "DUPLICATE_RUN" as const;

  constructor(readonly runId: string) {
    super(`Run already exists: ${runId}`);
    this.name = "DuplicateRunError";
  }
}

export class RunNotRunningError extends Error {
  readonly code = "RUN_NOT_RUNNING" as const;

  constructor(readonly runId: string) {
    super(`Run is not RUNNING: ${runId}`);
    this.name = "RunNotRunningError";
  }
}
