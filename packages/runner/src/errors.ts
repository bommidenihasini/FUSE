import type { RunStatus } from "@fuse/contracts";

export class SyntheticToolError extends Error {
  readonly code = "SYNTHETIC_TOOL_ERROR" as const;

  constructor(readonly errorCode: string) {
    super(`Synthetic tool error: ${errorCode}`);
    this.name = "SyntheticToolError";
  }
}

export class RunnerCannotContinueError extends Error {
  readonly code = "RUNNER_CANNOT_CONTINUE" as const;

  constructor(readonly status: RunStatus) {
    super(`Runner cannot continue after ${status}`);
    this.name = "RunnerCannotContinueError";
  }
}

export class UnknownScenarioError extends Error {
  readonly code = "UNKNOWN_SCENARIO" as const;

  constructor(readonly scenarioId: string) {
    super(`Unknown scenario: ${scenarioId}`);
    this.name = "UnknownScenarioError";
  }
}
