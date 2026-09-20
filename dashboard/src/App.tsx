import { useState } from "react";
import { startFailureSimulation, type FailureSimulationResult } from "./startFailureSimulation";

function App() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FailureSimulationResult | null>(null);

  async function onStart() {
    setBusy(true);
    setResult(null);
    const next = await startFailureSimulation();
    setResult(next);
    setBusy(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B0D12",
        color: "#F4F1EA",
        padding: "48px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <p style={{ color: "#55D6FF", letterSpacing: "0.12em" }}>
        FUSE / AI OPERATIONS CONTROL ROOM
      </p>
      <p style={{ color: "#8D96A8", fontSize: "13px" }}>Synthetic demo data</p>

      <h1>Protect your AI agent from runaway calls.</h1>

      <p style={{ maxWidth: "620px", color: "#B8C0CC" }}>
        Fuse checks every model and tool call before it runs. If an agent
        repeats a failed action too many times, Fuse blocks the next call.
      </p>

      <button
        type="button"
        disabled={busy}
        style={{
          background: "#55D6FF",
          color: "#0B0D12",
          border: 0,
          borderRadius: "8px",
          padding: "12px 18px",
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
        }}
        onClick={() => {
          void onStart();
        }}
      >
        {busy ? "Running simulation…" : "Start failure simulation"}
      </button>

      {result?.ok ? (
        <section style={{ marginTop: "28px", maxWidth: "640px" }}>
          <p style={{ color: "#FF6B6B", fontWeight: 700, letterSpacing: "0.08em" }}>
            {result.status}
          </p>
          <p style={{ fontFamily: "ui-monospace, monospace" }}>runId {result.runId}</p>
          <p>Next invocation blocked.</p>
          {result.breakerReason ? <p style={{ color: "#8D96A8" }}>{result.breakerReason}</p> : null}
        </section>
      ) : null}

      {result && !result.ok ? (
        <p style={{ marginTop: "24px", color: "#FF6B6B", maxWidth: "640px" }}>{result.message}</p>
      ) : null}

      <p style={{ marginTop: "48px", color: "#8D96A8", maxWidth: "640px" }}>
        Full control room: from the repo root run <code>pnpm api:dev</code> and{" "}
        <code>pnpm ui:dev</code>, then open the app in <code>apps/dashboard</code>.
      </p>
    </main>
  );
}

export default App;
