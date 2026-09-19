"use client";

import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRun, getRunEvents } from "@/lib/api";
import { elapsedMs, formatMs, formatUsd, scenarioTitle } from "@/lib/format";
import { AuditTimeline } from "@/components/AuditTimeline";
import { BreakerAlert, SafeCompletionCard } from "@/components/RunAlerts";
import { MetricCard, ErrorState, LoadingState } from "@/components/States";
import { PolicyCard } from "@/components/PolicyCard";
import { StatusBadge, ModeBadge } from "@/components/StatusBadge";
import { useRef } from "react";
import { ArrowLeft, History, ShieldAlert } from "lucide-react";

export function RunPage() {
  const { runId } = useParams();
  const auditTimelineRef = useRef<HTMLDivElement>(null);

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId ?? ""),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status === "RUNNING" || status === "CREATED" ? 1000 : false;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["events", runId],
    queryFn: () => getRunEvents(runId ?? ""),
    enabled: Boolean(runId),
    refetchInterval: () => {
      const status = runQuery.data?.run.status;
      return status === "RUNNING" || status === "CREATED" ? 1000 : false;
    },
  });

  if (runQuery.isError) {
    return (
      <ErrorState
        message={
          runQuery.error.message === "Backend unavailable"
            ? "Backend unavailable"
            : runQuery.error.message
        }
      />
    );
  }

  if (runQuery.isLoading || !runQuery.data) {
    return <LoadingState label="Loading run snapshot…" />;
  }

  const { run, nextInvocation, estimatedCostLabel, syntheticDataLabel } = runQuery.data;
  const events = eventsQuery.data?.events ?? [];
  const blocked = events.find((event) => event.type === "POLICY_BLOCKED");
  const allowedTools = events.filter((event) => event.type === "TOOL_CALL_ALLOWED");
  const isPolling = run.status === "RUNNING" || run.status === "CREATED";

  const scrollToAudit = () => {
    auditTimelineRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Top Bar */}
      <div>
        <Link
          to="/overview"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-text transition mb-3"
        >
          <ArrowLeft size={13} />
          <span>Back to Operations Overview</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-text">
                {scenarioTitle(run.scenario)}
              </h1>
              <StatusBadge status={run.status} />
              <ModeBadge />
              {isPolling && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-running bg-running/10 px-2.5 py-1 rounded-full border border-running/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-running animate-ping" />
                  <span>Polling pre-call events…</span>
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
              <span>Run ID: <strong className="text-text">{run.runId}</strong></span>
              <span>·</span>
              <span>{syntheticDataLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Run status {run.status}
        {nextInvocation ? `, next invocation ${nextInvocation}` : ""}
      </p>

      {/* Terminal State Alert Banners */}
      <div>
        {run.status === "BREAKER_TRIPPED" && (
          <BreakerAlert
            reasonCode={run.breakerReasonCode}
            reason={run.breakerReason}
            onViewAuditClick={scrollToAudit}
          />
        )}

        {run.status === "COMPLETED" && (
          <SafeCompletionCard
            callsAllowed={allowedTools.length}
            estimatedCost={formatUsd(run.estimatedCostUsd)}
            runtime={formatMs(elapsedMs(run.startedAt, run.endedAt))}
          />
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 font-mono">
        <MetricCard label="Step count" value={String(run.stepCount)} hint="Total steps recorded" />
        <MetricCard
          label={estimatedCostLabel}
          value={formatUsd(run.estimatedCostUsd)}
          hint="Estimate, not an AWS bill"
        />
        <MetricCard
          label="Elapsed runtime"
          value={formatMs(elapsedMs(run.startedAt, run.endedAt))}
          hint="Wall-clock time"
        />
        <MetricCard
          label="Audit events count"
          value={String(events.length)}
          hint="Persisted ledger entries"
        />
      </div>

      {/* Detailed Breaker Analysis (When Tripped) */}
      {run.status === "BREAKER_TRIPPED" && (
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Previous Allowed Calls */}
          <article className="rounded-[14px] border border-border bg-[#0D1626] p-6 shadow-md">
            <h2 className="font-display text-lg font-bold text-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-completed" />
              <span>Previous Allowed Invocations ({allowedTools.length})</span>
            </h2>
            <p className="text-xs text-text-secondary mt-1 font-sans">
              These actions were evaluated and permitted because they remained within policy thresholds.
            </p>

            <ul className="mt-4 space-y-2 font-mono text-xs">
              {allowedTools.map((event) => (
                <li
                  key={event.sequence}
                  className="flex items-center justify-between p-2.5 rounded bg-[#060912] border border-border/40 text-text"
                >
                  <span>#{event.sequence} {event.name} ({event.kind})</span>
                  <span className="text-completed font-semibold">ALLOWED</span>
                </li>
              ))}
            </ul>
          </article>

          {/* Proposed Blocked Call */}
          <article className="rounded-[14px] border border-breaker/60 bg-[#151219] p-6 shadow-md relative overflow-hidden">
            <h2 className="font-display text-lg font-bold text-breaker flex items-center gap-2">
              <ShieldAlert size={18} />
              <span>Proposed Blocked Invocation</span>
            </h2>
            <p className="text-xs text-text-secondary mt-1 font-sans">
              This action was denied by <code className="text-active font-mono text-xs">beforeCall()</code>. The underlying call was not executed.
            </p>

            <div className="mt-4 p-4 rounded-[10px] bg-[#060912] border border-breaker/40 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Target Action:</span>
                <span className="text-breaker font-bold">{blocked?.name ?? "verify_vendor"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Call Kind:</span>
                <span className="text-text">{blocked?.kind ?? "tool"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Execution Status:</span>
                <span className="text-breaker font-bold">BLOCKED (Not executed)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/40">
                <span className="text-muted">Threshold Boundary:</span>
                <span className="text-active">
                  {run.policySnapshot.maxRepeatedActionCount} repeated actions
                </span>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Audit Timeline & Policy Thresholds Card */}
      <section ref={auditTimelineRef} className="grid gap-6 lg:grid-cols-[1fr_340px] pt-4">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-text flex items-center gap-2">
              <History size={20} className="text-active" />
              <span>Immutable Audit Timeline</span>
            </h2>
            <span className="font-mono text-xs text-muted">GET /runs/{run.runId}/events</span>
          </div>

          <div>
            {eventsQuery.isError ? (
              <ErrorState message="Could not load audit events from API" />
            ) : (
              <AuditTimeline events={events} />
            )}
          </div>
        </div>

        {/* Policy Threshold Progress */}
        <div className="space-y-6">
          <PolicyCard
            policy={run.policySnapshot}
            observed={{
              steps: run.stepCount,
              estimatedCostUsd: run.estimatedCostUsd,
              repeated: allowedTools.filter((event) => event.name === "verify_vendor").length,
            }}
          />

          <div className="p-5 rounded-[12px] border border-border bg-[#0D1626] font-mono text-xs text-muted space-y-2">
            <div className="text-text font-bold">Enforcement Contract</div>
            <p className="text-[11px] leading-relaxed text-text-secondary font-sans">
              All model and tool calls pass through <code className="text-active">Fuse.beforeCall()</code>.
              When a policy violation is detected, the run transitions to <code className="text-breaker">BREAKER_TRIPPED</code> and the next call is prevented from firing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
