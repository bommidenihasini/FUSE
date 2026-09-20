export type FailureSimulationResult =
  | {
      ok: true;
      runId: string;
      status: string;
      nextInvocation: string;
      breakerReason?: string;
    }
  | {
      ok: false;
      message: string;
    };

type RunEnvelope = {
  run?: {
    runId?: string;
    status?: string;
    breakerReason?: string;
  };
  nextInvocation?: string;
  error?: string;
};

export async function startFailureSimulation(
  fetchImpl: typeof fetch = fetch,
): Promise<FailureSimulationResult> {
  let response: Response;
  try {
    response = await fetchImpl("/runs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        scenario: "invoice-verification-loop",
        policyId: "policy-demo-strict",
      }),
    });
  } catch {
    return {
      ok: false,
      message: "Backend unavailable. From the repo root run pnpm api:dev, then retry.",
    };
  }

  let data: RunEnvelope = {};
  try {
    data = (await response.json()) as RunEnvelope;
  } catch {
    return { ok: false, message: "Invalid API response." };
  }

  if (!response.ok || !data.run?.runId || !data.run.status) {
    return {
      ok: false,
      message: data.error ?? "Request failed. Confirm pnpm api:dev is running on port 8787.",
    };
  }

  return {
    ok: true,
    runId: data.run.runId,
    status: data.run.status,
    nextInvocation: data.nextInvocation ?? "UNKNOWN",
    breakerReason: data.run.breakerReason,
  };
}
