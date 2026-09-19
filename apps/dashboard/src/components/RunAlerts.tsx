"use client";

import { CheckCircle2, ChevronDown, ShieldAlert } from "lucide-react";

export function BreakerAlert({
  reasonCode,
  reason,
  onViewAuditClick,
}: {
  reasonCode?: string;
  reason?: string;
  onViewAuditClick?: () => void;
}) {
  return (
    <section
      className="breaker-pulse rounded-[14px] border-2 border-breaker/60 bg-gradient-to-r from-breaker/15 via-[#15243A] to-[#0D1626] p-6 sm:p-8 shadow-[0_0_50px_rgba(255,107,107,0.15)] relative overflow-hidden"
      aria-live="assertive"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-breaker/30 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-breaker/20 text-breaker flex items-center justify-center border border-breaker/40">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-breaker font-bold">
              PRE-CALL POLICY ENFORCEMENT
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-breaker">
              BREAKER TRIPPED
            </h2>
          </div>
        </div>

        <div className="rounded-[8px] bg-breaker/20 border border-breaker px-4 py-2 text-xs sm:text-sm font-mono text-breaker font-bold flex items-center gap-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-breaker animate-ping" />
          <span>Next invocation blocked</span>
        </div>
      </div>

      <div className="mt-5 max-w-3xl">
        <p className="text-sm sm:text-base text-text leading-relaxed font-sans font-medium">
          Fuse detected that the next proposed action would exceed the configured repeated-action
          policy. The underlying invocation was not executed.
        </p>

        {reasonCode && (
          <div className="mt-4 p-3.5 rounded-[8px] bg-[#060912]/80 border border-breaker/30 font-mono text-xs flex flex-wrap items-center gap-3">
            <span className="text-muted uppercase">Reason Code:</span>
            <span className="text-breaker font-bold">{reasonCode}</span>
            {reason && <span className="text-text-secondary">· {reason}</span>}
          </div>
        )}
      </div>

      {onViewAuditClick && (
        <div className="mt-5 pt-4 border-t border-border/30 flex justify-end">
          <button
            onClick={onViewAuditClick}
            className="text-xs font-mono text-active hover:text-text transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Jump to Audit Timeline Evidence</span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </section>
  );
}

export function SafeCompletionCard({
  callsAllowed,
  estimatedCost,
  runtime,
}: {
  callsAllowed?: number;
  estimatedCost?: string;
  runtime?: string;
}) {
  return (
    <section
      className="rounded-[14px] border border-completed/50 bg-gradient-to-r from-completed/10 via-[#0D1626] to-[#060912] p-6 sm:p-8"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-completed/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-completed/20 text-completed flex items-center justify-center border border-completed/40">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-completed font-bold">
              SAFE RUN VERIFICATION
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-completed">
              RUN COMPLETED SAFELY
            </h2>
          </div>
        </div>

        <div className="rounded-[8px] bg-completed/20 border border-completed/40 px-3.5 py-1.5 text-xs font-mono text-completed font-semibold flex items-center gap-2 self-start sm:self-auto">
          <span>Status: COMPLETED</span>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-text-secondary leading-relaxed font-sans">
        The workflow completed without exceeding its configured policy. All proposed model and tool
        calls were verified under thresholds before execution.
      </p>

      {(callsAllowed !== undefined || estimatedCost || runtime) && (
        <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-border/30 font-mono text-xs">
          {callsAllowed !== undefined && (
            <div>
              <span className="text-muted block">Calls Allowed</span>
              <span className="text-text font-semibold">{callsAllowed}</span>
            </div>
          )}
          {estimatedCost && (
            <div>
              <span className="text-muted block">Estimated Cost</span>
              <span className="text-text font-semibold">{estimatedCost}</span>
            </div>
          )}
          {runtime && (
            <div>
              <span className="text-muted block">Runtime</span>
              <span className="text-text font-semibold">{runtime}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
