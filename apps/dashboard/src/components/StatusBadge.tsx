import { cn } from "@/lib/cn";
import { statusLabel, statusTone } from "@/lib/status";
import type { RunStatus } from "@/lib/api";

const toneClass: Record<ReturnType<typeof statusTone>, string> = {
  breaker: "border-breaker/40 bg-breaker/10 text-breaker",
  completed: "border-completed/40 bg-completed/10 text-completed",
  running: "border-running/40 bg-running/10 text-running",
  muted: "border-border bg-panel text-muted",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        toneClass[statusTone(status)],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function ModeBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-active/30 bg-active/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-active uppercase">
      Synthetic demo mode
    </span>
  );
}
