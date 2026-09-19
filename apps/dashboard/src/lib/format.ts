export function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function formatMs(value: number): string {
  if (value < 1000) {
    return `${String(value)} ms`;
  }
  return `${(value / 1000).toFixed(1)} s`;
}

export function elapsedMs(startedAt: string, endedAt?: string): number {
  const start = Date.parse(startedAt);
  const end = endedAt === undefined ? Date.now() : Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0;
  }
  return end - start;
}

export function scenarioTitle(scenario: string): string {
  switch (scenario) {
    case "invoice-verification-loop":
      return "Invoice loop";
    case "safe-completion":
      return "Safe completion";
    case "bounded-tool-error":
      return "Bounded tool error";
    default:
      return scenario;
  }
}
