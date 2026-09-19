import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";

export function HealthIndicator() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 15_000,
    retry: 1,
  });

  if (health.isError) {
    return (
      <p className="text-xs text-breaker" role="status">
        Backend unavailable
      </p>
    );
  }

  return (
    <p className="text-xs text-muted" role="status">
      {health.data?.ok ? "API reachable" : "Checking API…"} · Live Bedrock pending AWS account
      verification
    </p>
  );
}
