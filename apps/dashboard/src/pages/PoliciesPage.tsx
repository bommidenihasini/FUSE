"use client";

import { useQuery } from "@tanstack/react-query";
import { getPolicies } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/States";
import { ModeBadge } from "@/components/StatusBadge";
import { formatMs, formatUsd } from "@/lib/format";
import { Clock, Coins, Lock, Repeat, Scale, ShieldCheck } from "lucide-react";

export function PoliciesPage() {
  const query = useQuery({ queryKey: ["policies"], queryFn: getPolicies });

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error.message === "Backend unavailable"
            ? "Backend unavailable"
            : query.error.message
        }
      />
    );
  }

  if (query.isLoading || !query.data) {
    return <LoadingState label="Loading policy contracts from API…" />;
  }

  const { policies, syntheticDataLabel } = query.data;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale size={16} className="text-[#58D9FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              CONTRACT REPOSITORY
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Enforcement Policies
          </h1>
          <p className="mt-1 text-xs font-mono text-zinc-400">
            {syntheticDataLabel}. Immutable per-run policy contract definitions.
          </p>
        </div>

        <ModeBadge />
      </div>

      {/* Contract Notice */}
      <div className="rounded-xl border border-white/[0.08] bg-[#202227] p-4 flex items-center gap-3">
        <Lock size={16} className="text-[#10B981] shrink-0" />
        <div className="text-xs font-mono text-zinc-300">
          <strong className="text-white">Deterministic Evaluation:</strong> Policies are captured as immutable snapshots at run creation to guarantee reproducible, zero-side-effect enforcement.
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {policies.map((policy) => (
          <div
            key={policy.policyId}
            className="rounded-2xl border border-white/[0.08] bg-[#202227] p-5 shadow-xl space-y-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-white">{policy.name}</h2>
                    <p className="font-mono text-[11px] text-zinc-500">{policy.policyId}</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  ACTIVE
                </span>
              </div>

              {/* 4 Limits Breakdown */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-[#18191C] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                    <Repeat size={12} className="text-[#58D9FF]" />
                    <span>Repeated Action</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {policy.maxRepeatedActionCount} max
                  </div>
                  <span className="text-[10px] text-zinc-500">Normalized signature</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#18191C] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                    <Scale size={12} className="text-[#58D9FF]" />
                    <span>Max Steps</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {policy.maxSteps} max
                  </div>
                  <span className="text-[10px] text-zinc-500">Call stack limit</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#18191C] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                    <Coins size={12} className="text-[#58D9FF]" />
                    <span>Cost Cap</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {formatUsd(policy.maxEstimatedCostUsd)}
                  </div>
                  <span className="text-[10px] text-zinc-500">Estimated cost limit</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#18191C] border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-semibold">
                    <Clock size={12} className="text-[#58D9FF]" />
                    <span>Max Runtime</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {formatMs(policy.maxRuntimeMs)}
                  </div>
                  <span className="text-[10px] text-zinc-500">Timeout limit</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
              <span>GET /policies</span>
              <span className="text-[#58D9FF]">Pre-call enforcement</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
