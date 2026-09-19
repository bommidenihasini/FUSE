"use client";

import { useState } from "react";
import type { AuditEvent } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { eventLabel } from "@/lib/status";
import { ChevronDown, ChevronRight } from "lucide-react";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);

  if (ordered.length === 0) {
    return (
      <div className="rounded-[12px] border border-border bg-[#0D1626] p-6 text-center text-sm font-mono text-muted">
        No audit events recorded for this run yet.
      </div>
    );
  }

  return (
    <ol className="space-y-2.5" aria-label="Audit timeline">
      {ordered.map((event) => (
        <AuditEventRow key={event.sequence} event={event} />
      ))}
    </ol>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const [open, setOpen] = useState(false);
  const isTrip = event.type === "BREAKER_TRIPPED";
  const isBlocked = event.type === "POLICY_BLOCKED";
  const isAllowed = event.type === "TOOL_CALL_ALLOWED" || event.type === "MODEL_CALL_ALLOWED";

  const badgeConfig = isTrip
    ? {
        label: "TRIPPED",
        color: "text-breaker bg-breaker/15 border-breaker/40",
      }
    : isBlocked
    ? {
        label: "BLOCKED",
        color: "text-breaker bg-breaker/15 border-breaker/40",
      }
    : isAllowed
    ? {
        label: "ALLOWED",
        color: "text-completed bg-completed/10 border-completed/30",
      }
    : {
        label: event.type.replace(/_/g, " "),
        color: "text-muted bg-[#15243A] border-border/50",
      };

  const borderClass = isTrip || isBlocked
    ? "border-breaker/50 bg-[#151219]"
    : "border-border bg-[#0D1626] hover:border-border-strong";

  return (
    <li className={`rounded-[12px] border p-4 transition-all duration-160 ${borderClass}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left cursor-pointer select-none"
        aria-expanded={open}
        onClick={() => setOpen((val) => !val)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted w-8">#{event.sequence}</span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-sm font-medium text-text">{eventLabel(event.type)}</span>
            {event.name && (
              <span className="font-mono text-xs text-active">
                {event.name} {event.kind ? `(${event.kind})` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeConfig.color}`}
          >
            {badgeConfig.label}
          </span>
          <time className="font-mono text-xs text-muted hidden md:inline" dateTime={event.timestamp}>
            {event.timestamp.split("T")[1]?.replace("Z", "") ?? event.timestamp}
          </time>
          {open ? (
            <ChevronDown size={14} className="text-muted" />
          ) : (
            <ChevronRight size={14} className="text-muted" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-border/40 font-mono text-xs text-muted space-y-1.5 animate-in fade-in duration-160">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2">
            <div>
              <span className="text-muted/60 block text-[10px] uppercase">Timestamp</span>
              <span className="text-text">{event.timestamp}</span>
            </div>
            <div>
              <span className="text-muted/60 block text-[10px] uppercase">Call Kind</span>
              <span className="text-text">{event.kind ?? "n/a"}</span>
            </div>
            <div>
              <span className="text-muted/60 block text-[10px] uppercase">Action Name</span>
              <span className="text-active">{event.name ?? "n/a"}</span>
            </div>
            <div>
              <span className="text-muted/60 block text-[10px] uppercase">Policy Result</span>
              <span
                className={
                  event.allowed === true
                    ? "text-completed font-semibold"
                    : event.allowed === false
                    ? "text-breaker font-semibold"
                    : "text-muted"
                }
              >
                {event.allowed !== undefined ? (event.allowed ? "ALLOWED" : "BLOCKED") : "N/A"}
              </span>
            </div>
          </div>

          {event.reasonCode && (
            <div className="p-2 rounded bg-[#060912] border border-breaker/30 text-breaker">
              <span className="text-muted/80 mr-2">Reason Code:</span>
              <span className="font-bold">{event.reasonCode}</span>
              {event.reason && <span className="text-text-secondary ml-2">— {event.reason}</span>}
            </div>
          )}

          {event.estimatedCostUsd !== undefined && (
            <div className="text-muted">
              Estimated run cost:{" "}
              <span className="text-text font-semibold">{formatUsd(event.estimatedCostUsd)}</span>{" "}
              <span className="text-[10px] text-muted/60">(Estimate, not AWS bill)</span>
            </div>
          )}

          {event.stableSignature && (
            <div className="text-muted truncate">
              Normalized signature:{" "}
              <span className="text-text-secondary">{event.stableSignature}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
