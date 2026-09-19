"use client";

interface ThresholdBarProps {
  label: string;
  observed: number;
  max: number;
  unit?: string;
  formatValue?: (val: number) => string;
}

export function ThresholdBar({
  label,
  observed,
  max,
  unit = "",
  formatValue,
}: ThresholdBarProps) {
  const percentage = Math.min(100, Math.max(0, (observed / (max || 1)) * 100));
  const isTripped = observed >= max;
  const isWarning = percentage >= 70 && !isTripped;

  const barColor = isTripped
    ? "bg-breaker"
    : isWarning
    ? "bg-running"
    : "bg-active";

  const displayObserved = formatValue ? formatValue(observed) : `${observed}${unit}`;
  const displayMax = formatValue ? formatValue(max) : `${max}${unit}`;

  return (
    <div className="space-y-1.5 font-mono text-xs">
      <div className="flex items-center justify-between text-muted">
        <span>{label}</span>
        <span className={isTripped ? "text-breaker font-semibold" : "text-text"}>
          {displayObserved} / {displayMax}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#060912] border border-border/40">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
