import type { Event, EventType, PolicyDecision, Run } from "@fuse/contracts";
import {
  isTerminalStatus,
  RunNotFoundError,
  type AppendEventInput,
  type FuseRepository,
} from "@fuse/persistence";
import { evaluateBeforeCall } from "@fuse/policy-engine";
import { BreakerTrippedError, FailClosedError } from "./errors.js";
import {
  FUSE_BREAKER_DETAIL_TYPE,
  FUSE_BREAKER_SOURCE,
  type AfterCallInput,
  type BreakerTrippedNotice,
  type BreakerTrippedPublisher,
  type EnforcementCallInput,
  type FuseEnforcementOptions,
} from "./types.js";

function wrapClosed(message: string, cause: unknown): FailClosedError {
  return cause instanceof FailClosedError ? cause : new FailClosedError(message, cause);
}

function elapsedMsFrom(startedAt: string, nowIso: string): number {
  const started = Date.parse(startedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(started) || !Number.isFinite(now)) {
    throw new FailClosedError("Run timestamps cannot be parsed for elapsed runtime");
  }
  if (now < started) {
    throw new FailClosedError("Clock moved before run start; failing closed");
  }
  return now - started;
}

function priorSignatures(events: readonly Event[]): string[] {
  const signatures: string[] = [];
  for (const event of events) {
    if (
      (event.type === "MODEL_CALL_ALLOWED" || event.type === "TOOL_CALL_ALLOWED") &&
      event.stableSignature !== undefined
    ) {
      signatures.push(event.stableSignature);
    }
  }
  return signatures;
}

function allowedEventType(kind: EnforcementCallInput["kind"]): EventType {
  return kind === "model" ? "MODEL_CALL_ALLOWED" : "TOOL_CALL_ALLOWED";
}

function completedEventType(kind: AfterCallInput["kind"], ok: boolean): EventType {
  if (kind === "tool" && !ok) {
    return "TOOL_CALL_FAILED";
  }
  return kind === "model" ? "MODEL_CALL_COMPLETED" : "TOOL_CALL_COMPLETED";
}

async function requireRun(repository: FuseRepository, runId: string): Promise<Run> {
  const run = await repository.getRun(runId);
  if (run === undefined) {
    throw new RunNotFoundError(runId);
  }
  return run;
}

/**
 * Pre-call enforcement wrapper. A denied decision never invokes the supplied
 * model or tool function. EventBridge publishing is an injected hook only.
 */
export class Fuse {
  private readonly repository: FuseRepository;
  private readonly nowIso: () => string;
  private readonly publishBreakerTripped: BreakerTrippedPublisher;

  constructor(options: FuseEnforcementOptions) {
    this.repository = options.repository;
    this.nowIso = options.nowIso;
    this.publishBreakerTripped = options.publishBreakerTripped ?? (async () => undefined);
  }

  async beforeCall(input: EnforcementCallInput): Promise<PolicyDecision> {
    let run: Run;
    try {
      run = await requireRun(this.repository, input.runId);
    } catch (error) {
      throw wrapClosed(`Cannot load run ${input.runId} for policy evaluation`, error);
    }

    if (isTerminalStatus(run.status)) {
      return this.deniedForTerminal(run, input);
    }

    let decision: PolicyDecision;
    try {
      const events = await this.repository.listEvents(input.runId);
      decision = evaluateBeforeCall({
        status: run.status,
        stepCount: run.stepCount,
        estimatedCostUsd: run.estimatedCostUsd,
        elapsedMs: elapsedMsFrom(run.startedAt, this.nowIso()),
        priorSignatures: priorSignatures(events),
        policy: run.policySnapshot,
        kind: input.kind,
        name: input.name,
        arguments: input.arguments,
        proposedEstimatedCostUsd: input.proposedEstimatedCostUsd,
      });
    } catch (error) {
      throw wrapClosed("Policy decision cannot be trusted; failing closed", error);
    }

    try {
      await this.append(input.runId, this.evaluationEvent(input, decision));
    } catch (error) {
      throw wrapClosed("Required POLICY_EVALUATED audit write failed; failing closed", error);
    }

    if (decision.allowed) {
      try {
        await this.append(input.runId, {
          type: allowedEventType(input.kind),
          timestamp: this.nowIso(),
          kind: input.kind,
          name: input.name,
          allowed: true,
          stableSignature: decision.stableSignature,
          estimatedCostUsd: input.proposedEstimatedCostUsd,
        });
        await this.repository.updateRunCounters(input.runId, {
          stepCount: run.stepCount + 1,
          modelCallCount: run.modelCallCount + (input.kind === "model" ? 1 : 0),
          toolCallCount: run.toolCallCount + (input.kind === "tool" ? 1 : 0),
          retryCount: run.retryCount,
          estimatedCostUsd: run.estimatedCostUsd + input.proposedEstimatedCostUsd,
        });
      } catch (error) {
        throw wrapClosed("Required allow-path audit write failed; failing closed", error);
      }
      return decision;
    }

    try {
      await this.append(input.runId, {
        type: "POLICY_BLOCKED",
        timestamp: this.nowIso(),
        kind: input.kind,
        name: input.name,
        allowed: false,
        reasonCode: decision.reasonCode,
        reason: decision.reason,
        stableSignature: decision.stableSignature,
        estimatedCostUsd: input.proposedEstimatedCostUsd,
        metadata: { nextInvocation: "BLOCKED" },
      });
      if (run.status === "RUNNING") {
        await this.tripBreaker(input.runId, decision.reason ?? "Next invocation blocked", {
          reasonCode: decision.reasonCode,
        });
      }
    } catch (error) {
      throw wrapClosed("Required deny-path audit write failed; failing closed", error);
    }

    return decision;
  }

  async afterCall(input: AfterCallInput): Promise<Event> {
    const run = await requireRun(this.repository, input.runId);
    if (run.status !== "RUNNING") {
      throw wrapClosed(`afterCall requires a RUNNING run; status is ${run.status}`, undefined);
    }

    const event = await this.append(input.runId, {
      type: completedEventType(input.kind, input.ok),
      timestamp: this.nowIso(),
      kind: input.kind,
      name: input.name,
      allowed: true,
      metadata: {
        ok: input.ok,
        ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
      },
    });

    if (!input.ok) {
      await this.repository.updateRunCounters(input.runId, {
        stepCount: run.stepCount,
        modelCallCount: run.modelCallCount,
        toolCallCount: run.toolCallCount,
        retryCount: run.retryCount + 1,
        estimatedCostUsd: run.estimatedCostUsd,
      });
    }

    return event;
  }

  async tripBreaker(
    runId: string,
    reason: string,
    extras: { reasonCode?: PolicyDecision["reasonCode"] } = {},
  ): Promise<Run> {
    const run = await requireRun(this.repository, runId);
    if (run.status === "BREAKER_TRIPPED") {
      return run;
    }

    const at = this.nowIso();
    await this.append(runId, {
      type: "BREAKER_TRIPPED",
      timestamp: at,
      allowed: false,
      reason,
      reasonCode: extras.reasonCode,
      metadata: { nextInvocation: "BLOCKED" },
    });

    const tripped = await this.repository.transitionRunState({
      runId,
      to: "BREAKER_TRIPPED",
      at,
      breakerReason: reason,
      breakerReasonCode: extras.reasonCode,
    });

    const notice: BreakerTrippedNotice = {
      source: FUSE_BREAKER_SOURCE,
      detailType: FUSE_BREAKER_DETAIL_TYPE,
      runId,
      reason,
      at,
    };
    if (extras.reasonCode !== undefined) {
      notice.reasonCode = extras.reasonCode;
    }
    try {
      await this.publishBreakerTripped(notice);
    } catch {
      // Audit already persisted. Live EventBridge is out of scope for C1.6.
    }

    return tripped;
  }

  async invokeTool<T>(input: EnforcementCallInput, execute: () => Promise<T>): Promise<T> {
    return this.invoke(input, execute);
  }

  async invokeModel<T>(input: EnforcementCallInput, execute: () => Promise<T>): Promise<T> {
    return this.invoke(input, execute);
  }

  private async invoke<T>(input: EnforcementCallInput, execute: () => Promise<T>): Promise<T> {
    const decision = await this.beforeCall(input);
    if (!decision.allowed) {
      throw new BreakerTrippedError(
        input.runId,
        decision.reason ?? "Next invocation blocked",
        decision.reasonCode,
      );
    }

    let result: T;
    try {
      result = await execute();
    } catch (error) {
      await this.afterCall({
        runId: input.runId,
        kind: input.kind,
        name: input.name,
        ok: false,
        errorCode: error instanceof Error ? error.name : "ERROR",
      });
      throw error;
    }

    await this.afterCall({
      runId: input.runId,
      kind: input.kind,
      name: input.name,
      ok: true,
    });
    return result;
  }

  private async append(runId: string, event: AppendEventInput): Promise<Event> {
    return this.repository.appendEvent(runId, event);
  }

  private evaluationEvent(input: EnforcementCallInput, decision: PolicyDecision): AppendEventInput {
    const event: AppendEventInput = {
      type: "POLICY_EVALUATED",
      timestamp: this.nowIso(),
      kind: input.kind,
      name: input.name,
      allowed: decision.allowed,
      estimatedCostUsd: input.proposedEstimatedCostUsd,
      metadata: {
        observed: decision.observed,
        costLabel: "estimated",
      },
    };
    if (decision.reasonCode !== undefined) {
      event.reasonCode = decision.reasonCode;
    }
    if (decision.reason !== undefined) {
      event.reason = decision.reason;
    }
    if (decision.stableSignature !== undefined) {
      event.stableSignature = decision.stableSignature;
    }
    return event;
  }

  private deniedForTerminal(run: Run, input: EnforcementCallInput): PolicyDecision {
    return evaluateBeforeCall({
      status: run.status,
      stepCount: run.stepCount,
      estimatedCostUsd: run.estimatedCostUsd,
      elapsedMs: 0,
      priorSignatures: [],
      policy: run.policySnapshot,
      kind: input.kind,
      name: input.name,
      arguments: input.arguments,
      proposedEstimatedCostUsd: input.proposedEstimatedCostUsd,
    });
  }
}
