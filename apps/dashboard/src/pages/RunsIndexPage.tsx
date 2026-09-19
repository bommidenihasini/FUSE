"use client";

import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { loadRecentRuns, rememberRun } from "@/lib/recent";
import { startRun } from "@/lib/api";
import { STRICT_POLICY_ID } from "@/lib/status";
import { scenarioTitle } from "@/lib/format";
import { StatusBadge, ModeBadge } from "@/components/StatusBadge";
import { useState } from "react";
import type { RunStatus } from "@/lib/api";
import { ArrowRight, History, Play, ShieldAlert } from "lucide-react";

export function RunsIndexPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"ALL" | "BREAKER_TRIPPED" | "COMPLETED">("ALL");
  const recent = loadRecentRuns();

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
  });

  const filtered = recent.filter((run) => {
    if (filter === "BREAKER_TRIPPED") return run.status === "BREAKER_TRIPPED";
    if (filter === "COMPLETED") return run.status === "COMPLETED";
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={16} className="text-[#58D9FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              AUDIT TRAIL
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Run Ledger
          </h1>
          <p className="mt-1 text-xs font-mono text-zinc-400">
            Immutable pre-call enforcement records for this browser session.
          </p>
        </div>

        <ModeBadge />
      </div>

      {/* Filter Tabs & Quick Launch Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          {(["ALL", "BREAKER_TRIPPED", "COMPLETED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                filter === tab
                  ? "bg-zinc-700/80 text-white font-bold border border-white/20 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab === "ALL" ? `All (${recent.length})` : tab === "BREAKER_TRIPPED" ? "Breaker Tripped" : "Completed"}
            </button>
          ))}
        </div>

        <button
          disabled={start.isPending}
          onClick={() => start.mutate("invoice-verification-loop")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] px-4 py-2 text-xs font-bold text-white transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play size={13} fill="currentColor" />
          <span>Launch Runaway Scenario</span>
        </button>
      </div>

      {/* Runs Table / List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#202227] p-10 text-center space-y-4 shadow-lg">
          <ShieldAlert size={32} className="mx-auto text-zinc-500" />
          <p className="text-sm font-mono text-zinc-400">
            {filter === "ALL"
              ? "No runs recorded in this browser session yet."
              : `No runs match filter "${filter}".`}
          </p>
          <button
            disabled={start.isPending}
            onClick={() => start.mutate("invoice-verification-loop")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] px-4 py-2 text-xs font-bold text-white transition"
          >
            <Play size={13} fill="currentColor" />
            <span>Launch Benchmark Scenario</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#202227] divide-y divide-white/[0.04] overflow-hidden shadow-xl font-mono text-xs">
          {filtered.map((item) => (
            <Link
              key={item.runId}
              to={`/runs/${item.runId}`}
              className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition group"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-400">{item.runId}</span>
                  <span className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {scenarioTitle(item.scenario)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  Pre-call enforcement gate · Audited timeline preserved
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={item.status as RunStatus} />
                <ArrowRight size={14} className="text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
