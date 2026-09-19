import type { BeforeCallInput, CallKind, PolicyReasonCode } from "@fuse/contracts";
import type { FuseRepository } from "@fuse/persistence";

export const FUSE_BREAKER_SOURCE = "fuse.breaker" as const;
export const FUSE_BREAKER_DETAIL_TYPE = "BreakerTripped" as const;

export interface EnforcementCallInput extends BeforeCallInput {
  proposedEstimatedCostUsd: number;
}

export interface AfterCallInput {
  runId: string;
  kind: CallKind;
  name: string;
  ok: boolean;
  output?: unknown;
  errorCode?: string;
}

export interface BreakerTrippedNotice {
  source: typeof FUSE_BREAKER_SOURCE;
  detailType: typeof FUSE_BREAKER_DETAIL_TYPE;
  runId: string;
  reason: string;
  reasonCode?: PolicyReasonCode;
  at: string;
}

export type BreakerTrippedPublisher = (notice: BreakerTrippedNotice) => Promise<void>;

export interface FuseEnforcementOptions {
  repository: FuseRepository;
  nowIso: () => string;
  /**
   * Optional hook. C1.6 does not publish to AWS EventBridge.
   * A thrown publisher must not undo a persisted breaker trip.
   */
  publishBreakerTripped?: BreakerTrippedPublisher;
}
