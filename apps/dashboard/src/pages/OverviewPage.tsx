"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { startRun, getPolicies, type RunStatus } from "@/lib/api";
import { STRICT_POLICY_ID } from "@/lib/status";
import { rememberRun, loadRecentRuns } from "@/lib/recent";
import { formatMs, formatUsd, scenarioTitle } from "@/lib/format";
import { ErrorState } from "@/components/States";
import { StatusBadge, ModeBadge } from "@/components/StatusBadge";
import { HealthIndicator } from "@/components/HealthIndicator";
import {
  ArrowUpRight,
  CheckCircle2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function OverviewPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const recent = useQuery({
    queryKey: ["recent-runs"],
    queryFn: async () => loadRecentRuns(),
  });

  const policiesQuery = useQuery({
    queryKey: ["policies"],
    queryFn: () => getPolicies(),
  });

  const start = useMutation({
    mutationFn: (scenario: string) => startRun(scenario, STRICT_POLICY_ID),
    onSuccess: (envelope) => {
      rememberRun({
        runId: envelope.run.runId,
        scenario: envelope.run.scenario,
        status: envelope.run.status,
      });
      void navigate(`/runs/${envelope.run.runId}`);
    },
    onError: (err: Error) => {
      setError(err.message === "Backend unavailable" ? "Backend unavailable" : err.message);
    },
  });

  const strictPolicy = policiesQuery.data?.policies.find((p) => p.policyId === STRICT_POLICY_ID);
  const runsList = recent.data ?? [];
  const latestRun = runsList.length > 0 ? runsList[0] : null;

  return (
    <div className="space-y-6 font-sans max-w-5xl">
      {/* Top Header & System Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white font-display">
              Fuse
            </h1>
            <ModeBadge />
          </div>
          <p className="mt-2 text-sm text-zinc-300 font-sans leading-relaxed max-w-2xl">
            Fuse evaluates every integrated model and tool call, then blocks the next invocation when an agent exceeds its policy.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <HealthIndicator />
          <span className="text-[11px] font-mono text-zinc-400">
            Live Bedrock pending AWS account verification
          </span>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {/* Primary Judge Benchmark Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Execute Synthetic Benchmark Run
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            Pre-call gate enforcement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Start Invoice Loop */}
          <div className="bg-[#202227] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Breaker Test
                </span>
                <ShieldAlert size={18} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-display group-hover:text-amber-400 transition-colors">
                Start Invoice Loop
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Triggers an infinite vendor verification loop. Fuse evaluates the next call, detects repeated normalized actions, and blocks the 4th invocation before execution.
              </p>
            </div>

            <button
              disabled={start.isPending}
              onClick={() => {
                setError(null);
                start.mutate("invoice-verification-loop");
              }}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" />
              <span>{start.isPending ? "Evaluating pre-call policy..." : "Start Invoice Loop"}</span>
            </button>
          </div>

          {/* Card 2: Run Safe Completion */}
          <div className="bg-[#202227] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Safe Flow
                </span>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white font-display group-hover:text-emerald-400 transition-colors">
                Run Safe Completion
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Executes a normal multi-step invoice verification flow. Valid actions remain within policy bounds and the run completes safely.
              </p>
            </div>

            <button
              disabled={start.isPending}
              onClick={() => {
                setError(null);
                start.mutate("safe-completion");
              }}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" />
              <span>{start.isPending ? "Evaluating pre-call policy..." : "Run Safe Completion"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Policy Snapshot */}
      {strictPolicy && (
        <div className="bg-[#202227] border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2 text-white font-medium">
            <ShieldCheck size={16} className="text-[#10B981]" />
            <span>Active Contract: {strictPolicy.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-zinc-300">
            <span>Max Repeats: <strong className="text-white">{strictPolicy.maxRepeatedActionCount}</strong></span>
            <span>Max Steps: <strong className="text-white">{strictPolicy.maxSteps}</strong></span>
            <span>Cost Cap: <strong className="text-white">{formatUsd(strictPolicy.maxEstimatedCostUsd)}</strong></span>
            <span>Timeout: <strong className="text-white">{formatMs(strictPolicy.maxRuntimeMs)}</strong></span>
          </div>
        </div>
      )}

      {/* Verified Product Proof Explanation Box */}
      <div className="bg-[#202227] border border-white/[0.08] rounded-2xl p-5 space-y-3 font-sans text-xs">
        <h3 className="font-bold text-white font-display text-sm flex items-center gap-2">
          <Zap size={16} className="text-[#58D9FF]" />
          <span>Verified Pre-Call Architectural Proof</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-300 font-mono text-[11px] leading-relaxed">
          <div className="p-3 rounded-xl bg-[#18191C] border border-white/[0.05] space-y-1">
            <div className="text-amber-400 font-bold uppercase">Runaway Loop Scenario</div>
            <p className="text-zinc-400 font-sans text-xs">
              Agent proposes repeated action → Fuse evaluates next call → Detects duplicate signature → Blocks next invocation before execution → Run status becomes BREAKER_TRIPPED → Audit timeline records decision.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#18191C] border border-white/[0.05] space-y-1">
            <div className="text-emerald-400 font-bold uppercase">Safe Completion Scenario</div>
            <p className="text-zinc-400 font-sans text-xs">
              Bounded synthetic workflow → Fuse allows valid actions → Workflow finishes → Run status becomes COMPLETED → Audit timeline records completion.
            </p>
          </div>
        </div>
      </div>

      {/* Session Run Panel / Honest Empty State */}
      <div className="bg-[#202227] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-bold text-white font-display">Active Session Runs</h2>
          {latestRun && (
            <Link
              to={`/runs/${latestRun.runId}`}
              className="inline-flex items-center gap-1 text-xs font-mono text-[#58D9FF] hover:underline"
            >
              <span>Latest Run Audit Log ({latestRun.runId.slice(0, 8)}...)</span>
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {runsList.length === 0 ? (
          <div className="py-8 text-center space-y-2 font-mono text-xs text-zinc-400">
            <p className="text-white font-semibold">No demo run yet.</p>
            <p>Start a protected synthetic run to see Fuse evaluate and block the next invocation.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] font-mono text-xs">
            {runsList.map((run) => (
              <div
                key={run.runId}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2 gap-3 hover:bg-white/[0.02] rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-400">{run.runId.slice(0, 8)}...</span>
                  <span className="text-white font-medium">{scenarioTitle(run.scenario)}</span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <StatusBadge status={run.status as RunStatus} />
                  <div className="flex items-center gap-2">
                    <button
                      disabled={start.isPending}
                      onClick={() => {
                        setError(null);
                        start.mutate(run.scenario);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                      title="Re-run scenario"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <Link
                      to={`/runs/${run.runId}`}
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition"
                    >
                      <span>Audit Log</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
