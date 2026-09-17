function App( ) {
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

      <h1>Protect your AI agent from runaway calls.</h1>

      <p style={{ maxWidth: "620px", color: "#B8C0CC" }}>
        Fuse checks every model and tool call before it runs. If an agent
        repeats a failed action too many times, Fuse blocks the next call.
      </p>

      <button
        style={{
          background: "#55D6FF",
          color: "#0B0D12",
          border: 0,
          borderRadius: "8px",
          padding: "12px 18px",
          fontWeight: 700,
          cursor: "pointer",
        }}
        onClick={() => alert("The Fuse simulation will be connected later.")}
      >
        Start failure simulation
      </button>
    </main>
  );
}

export default App;