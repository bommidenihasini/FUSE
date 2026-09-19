import type { PolicyReasonCode } from "@fuse/contracts";

export class BreakerTrippedError extends Error {
  readonly code = "BREAKER_TRIPPED" as const;

  constructor(
    readonly runId: string,
    readonly reason: string,
    readonly reasonCode?: PolicyReasonCode,
  ) {
    super(reason);
    this.name = "BreakerTrippedError";
  }
}

export class FailClosedError extends Error {
  readonly code = "FAIL_CLOSED" as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FailClosedError";
  }
}
