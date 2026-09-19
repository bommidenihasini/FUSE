"use client";

import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { ModeBadge } from "@/components/StatusBadge";
import { Cpu, Terminal } from "lucide-react";

export function ArchitecturePage() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={16} className="text-[#58D9FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              SYSTEM ARCHITECTURE
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            AWS Pipeline Topology
          </h1>
          <p className="mt-1 text-xs font-mono text-zinc-400">
            Pre-call gate pattern connecting API Gateway, Lambda, DynamoDB, EventBridge, and Bedrock.
          </p>
        </div>

        <ModeBadge />
      </div>

      {/* Component Diagram */}
      <div className="bg-[#202227] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="font-display text-base font-bold text-white">
          AWS Service Topology
        </h2>
        <ArchitectureDiagram />
      </div>

      {/* Wrapper Contract Code Block */}
      <div className="bg-[#202227] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
        <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
          <Terminal size={18} className="text-[#58D9FF]" />
          <span>The Pre-Call Enforcement Gate Contract</span>
        </h2>
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Every model and tool call passes through <code className="text-[#58D9FF] font-mono">beforeCall</code> before execution. A policy breach blocks the next invocation instantly.
        </p>

        <div className="p-4 rounded-xl bg-[#18191C] border border-white/[0.05] font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed">
          <pre>{`// 1. Evaluate policy BEFORE executing the call
const decision = await fuse.beforeCall({
  runId,
  kind: "tool",
  name: "verify_vendor",
  arguments: { invoiceId: "INV-DEMO-001" },
  proposedEstimatedCostUsd: 0.01
});

// 2. If blocked: trip breaker & throw — zero calls executed
if (!decision.allowed) {
  await fuse.tripBreaker(runId, decision.reason);
  throw new BreakerTrippedError(decision.reason);
}

// 3. Execution proceeds ONLY if allowed
const result = await executeTool();

// 4. Update audit timeline & counters
await fuse.afterCall({ runId, result });`}</pre>
        </div>
      </div>
    </div>
  );
}
