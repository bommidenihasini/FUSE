import type { Policy, Run } from "@fuse/contracts";
import { BreakerTrippedError, Fuse } from "@fuse/enforcement";
import { isTerminalStatus, RunNotFoundError, type FuseRepository } from "@fuse/persistence";
import { getScenarioFixture, SYNTHETIC_DATA_LABEL, type ScenarioId } from "@fuse/test-fixtures";
import { RunnerCannotContinueError, SyntheticToolError, UnknownScenarioError } from "./errors.js";
import {
  copyInvoice,
  copyPolicy,
  defaultDemoPolicy,
  executeVerifyVendor,
  isScenarioId,
  planNextAction,
} from "./synthetic.js";
import {
  DEFAULT_RUNNER_SAFETY_CAP,
  ESTIMATED_CALL_COST_USD,
  HARD_RUNNER_SAFETY_CAP,
  SIMULATED_MODEL_NAME,
  VERIFY_VENDOR_TOOL,
  type InvoiceVerificationRunnerOptions,
  type Observation,
  type RunnerResult,
  type VendorVerification,
  type ModelPlan,
} from "./types.js";

function resolveSafetyCap(requested: number | undefined): number {
  const value = requested ?? DEFAULT_RUNNER_SAFETY_CAP;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Runner safety cap must be a positive integer");
  }
  return Math.min(value, HARD_RUNNER_SAFETY_CAP);
}

/**
 * Deterministic invoice-verification loop. Simulation only: no Amazon Bedrock,
 * no EventBridge, no HTTP tools.
 */
export class InvoiceVerificationRunner {
  private readonly repository: FuseRepository;
  private readonly fuse: Fuse;
  private readonly nowIso: () => string;
  private readonly policy: Policy;
  private readonly safetyCap: number;
  private modelExecutions = 0;
  private toolExecutions = 0;

  constructor(options: InvoiceVerificationRunnerOptions) {
    this.repository = options.repository;
    this.nowIso = options.nowIso;
    this.fuse = new Fuse({
      repository: options.repository,
      nowIso: options.nowIso,
      publishBreakerTripped: options.publishBreakerTripped,
    });
    this.policy = copyPolicy(options.policy ?? defaultDemoPolicy(options.nowIso()));
    this.safetyCap = resolveSafetyCap(options.safetyCap);
  }

  get modelExecutionCount(): number {
    return this.modelExecutions;
  }

  get toolExecutionCount(): number {
    return this.toolExecutions;
  }

  async run(scenarioId: ScenarioId): Promise<RunnerResult> {
    this.modelExecutions = 0;
    this.toolExecutions = 0;
    if (!isScenarioId(scenarioId)) {
      throw new UnknownScenarioError(scenarioId);
    }
    const fixture = getScenarioFixture(scenarioId);
    const invoice = copyInvoice(fixture.invoice);
    const createdAt = this.nowIso();
    const created = await this.repository.createRun({
      scenario: scenarioId,
      policySnapshot: copyPolicy(this.policy),
      createdAt,
    });
    await this.repository.appendEvent(created.runId, {
      type: "RUN_CREATED",
      timestamp: createdAt,
      metadata: {
        syntheticDataLabel: SYNTHETIC_DATA_LABEL,
        executionMode: "simulation",
        liveBedrock: false,
      },
    });
    const startedAt = this.nowIso();
    await this.repository.transitionRunState({
      runId: created.runId,
      to: "RUNNING",
      at: startedAt,
    });
    await this.repository.appendEvent(created.runId, {
      type: "RUN_STARTED",
      timestamp: startedAt,
    });
    return this.drive(created.runId, invoice);
  }

  async continueRun(runId: string): Promise<RunnerResult> {
    const run = await this.requireRun(runId);
    if (isTerminalStatus(run.status)) {
      throw new RunnerCannotContinueError(run.status);
    }
    if (!isScenarioId(run.scenario)) {
      throw new UnknownScenarioError(run.scenario);
    }
    const invoice = copyInvoice(getScenarioFixture(run.scenario).invoice);
    return this.drive(runId, invoice);
  }

  private async drive(
    runId: string,
    invoice: ReturnType<typeof copyInvoice>,
  ): Promise<RunnerResult> {
    let observation: Observation = "none";
    let iterations = 0;
    while (iterations < this.safetyCap) {
      iterations += 1;
      const current = await this.requireRun(runId);
      if (isTerminalStatus(current.status)) {
        return this.snapshot(runId);
      }

      let plan: ModelPlan;
      try {
        plan = await this.fuse.invokeModel(
          {
            runId,
            kind: "model",
            name: SIMULATED_MODEL_NAME,
            arguments: { invoiceId: invoice.invoiceId, observation },
            proposedEstimatedCostUsd: ESTIMATED_CALL_COST_USD,
          },
          async () => {
            this.modelExecutions += 1;
            return planNextAction(observation);
          },
        );
      } catch (error) {
        if (error instanceof BreakerTrippedError) {
          return this.snapshot(runId);
        }
        throw error;
      }

      if (plan.action === "complete") {
        await this.complete(runId);
        return this.snapshot(runId);
      }

      if (plan.name !== VERIFY_VENDOR_TOOL) {
        await this.fail(runId, "Unsupported tool; only verify_vendor is allowlisted");
        return this.snapshot(runId);
      }

      try {
        const output: VendorVerification = await this.fuse.invokeTool(
          {
            runId,
            kind: "tool",
            name: VERIFY_VENDOR_TOOL,
            arguments: { invoiceId: invoice.invoiceId },
            proposedEstimatedCostUsd: ESTIMATED_CALL_COST_USD,
          },
          async () => {
            this.toolExecutions += 1;
            return executeVerifyVendor(invoice);
          },
        );
        observation = output.status;
      } catch (error) {
        if (error instanceof BreakerTrippedError) {
          return this.snapshot(runId);
        }
        if (error instanceof SyntheticToolError) {
          observation = "tool_error";
          continue;
        }
        throw error;
      }
    }

    const latest = await this.requireRun(runId);
    if (!isTerminalStatus(latest.status)) {
      await this.fail(runId, "Hard runner safety cap reached");
    }
    return this.snapshot(runId);
  }

  private async complete(runId: string): Promise<void> {
    const at = this.nowIso();
    await this.repository.appendEvent(runId, { type: "RUN_COMPLETED", timestamp: at });
    await this.repository.transitionRunState({ runId, to: "COMPLETED", at });
  }

  private async fail(runId: string, reason: string): Promise<void> {
    const at = this.nowIso();
    await this.repository.appendEvent(runId, {
      type: "RUN_FAILED",
      timestamp: at,
      reason,
    });
    await this.repository.transitionRunState({ runId, to: "FAILED", at });
  }

  private async snapshot(runId: string): Promise<RunnerResult> {
    const run = await this.requireRun(runId);
    const events = await this.repository.listEvents(runId);
    return {
      run,
      events,
      modelExecutions: this.modelExecutions,
      toolExecutions: this.toolExecutions,
      executionMode: "simulation",
      liveBedrock: false,
      syntheticDataLabel: SYNTHETIC_DATA_LABEL,
    };
  }

  private async requireRun(runId: string): Promise<Run> {
    const run = await this.repository.getRun(runId);
    if (run === undefined) {
      throw new RunNotFoundError(runId);
    }
    return run;
  }
}
