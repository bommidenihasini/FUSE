const KEY = "fuse-recent-runs";

export interface RecentRun {
  runId: string;
  scenario: string;
  status: string;
}

export function loadRecentRuns(): RecentRun[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is RecentRun => {
      return (
        typeof item === "object" &&
        item !== null &&
        "runId" in item &&
        "scenario" in item &&
        "status" in item &&
        typeof item.runId === "string"
      );
    });
  } catch {
    return [];
  }
}

export function rememberRun(entry: RecentRun): void {
  const next = [entry, ...loadRecentRuns().filter((item) => item.runId !== entry.runId)].slice(0, 8);
  sessionStorage.setItem(KEY, JSON.stringify(next));
}
