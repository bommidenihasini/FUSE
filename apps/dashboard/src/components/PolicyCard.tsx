"use client";

import type { Policy } from "@/lib/api";
import { formatMs, formatUsd } from "@/lib/format";
import { ThresholdBar } from "./ThresholdBar";
import { ShieldCheck } from "lucide-react";

export function PolicyCard({
  policy,
  observed,
}: {
  policy: Policy;
  observed?: { steps: number; estimatedCostUsd: number; repeated: number };
}) {
  return (
    <article className="rounded-[14px] border border-border bg-[#0D1626] p-6 shadow-lg">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
        <ShieldCheck size={16} className="text-active" />
        <div>
          <h3 className="font-display text-base font-bold text-text">{policy.name}</h3>
          <p className="font-mono text-[11px] text-muted">{policy.policyId}</p>
        </div>
      </div>

      <div className="space-y-4">
        <ThresholdBar
          label="Steps Limit"
          observed={observed?.steps ?? 0}
          max={policy.maxSteps}
        />

        <ThresholdBar
          label="Repeated Actions"
          observed={observed?.repeated ?? 0}
          max={policy.maxRepeatedActionCount}
        />

        {observed && (
          <ThresholdBar
            label="Estimated Run Cost"
            observed={observed.estimatedCostUsd}
            max={policy.maxEstimatedCostUsd}
            formatValue={(v) => formatUsd(v)}
          />
        )}

        <div className="pt-3 border-t border-border/40 font-mono text-xs text-muted space-y-1">
          <div className="flex justify-between">
            <span>Cost Boundary:</span>
            <span className="text-text font-semibold">{formatUsd(policy.maxEstimatedCostUsd)}</span>
          </div>
          <div className="flex justify-between">
            <span>Max Runtime:</span>
            <span className="text-text font-semibold">{formatMs(policy.maxRuntimeMs)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
