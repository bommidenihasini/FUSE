"use client";

import { useEffect, useState } from "react";

export function CircuitHero() {
  // Animation timeline state (0 to 5 seconds):
  // 0s - 1.0s: Nodes appear softly
  // 1.0s - 2.2s: Cyan signal travels Model -> Policy Gate -> Tool (Allowed)
  // 2.2s - 3.2s: Repeated action detected, Policy Gate switches to Coral (#FF6B6B)
  // 3.2s - 4.2s: Next path visibly blocked (blocked signal stopped at gate)
  // 4.2s+: Audit indicator appears ("Next invocation blocked")
  const [animStage, setAnimStage] = useState<number>(0);
  const [mode, setMode] = useState<"loop" | "safe">("loop");

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setAnimStage(mode === "loop" ? 4 : 1);
      return;
    }

    setAnimStage(0);
    const t1 = setTimeout(() => setAnimStage(1), 600);
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;
    let t4: NodeJS.Timeout;

    if (mode === "loop") {
      t2 = setTimeout(() => setAnimStage(2), 1600);
      t3 = setTimeout(() => setAnimStage(3), 2600);
      t4 = setTimeout(() => setAnimStage(4), 3600);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [mode]);

  return (
    <div className="w-full max-w-[800px] mx-auto rounded-2xl border border-white/[0.08] bg-[#0A1220]/90 p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
      {/* Background Subtle Radial Lighting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(88, 217, 255, 0.2) 0%, transparent 65%)",
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Interactive Circuit Simulation
          </span>
        </div>

        {/* Interactive Mode Switches */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#060912] border border-white/[0.06] text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setMode("loop")}
            className={`px-2.5 py-1 rounded transition ${
              mode === "loop"
                ? "bg-breaker/20 text-breaker font-bold shadow-[0_0_10px_rgba(255,107,107,0.2)]"
                : "text-muted hover:text-text"
            }`}
          >
            Simulate Trip (Repeat Loop)
          </button>
          <button
            type="button"
            onClick={() => setMode("safe")}
            className={`px-2.5 py-1 rounded transition ${
              mode === "safe"
                ? "bg-completed/20 text-completed font-bold shadow-[0_0_10px_rgba(67,224,164,0.2)]"
                : "text-muted hover:text-text"
            }`}
          >
            Simulate Safe Run
          </button>
        </div>
      </div>

      <svg
        viewBox="0 0 700 240"
        role="img"
        aria-label="Fuse evaluates a model and tool path, then blocks the next invocation."
        className="h-auto w-full select-none"
      >
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-coral" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- CONNECTION WIRES --- */}
        {/* Wire 1: Model -> Fuse Policy Gate */}
        <path
          d="M 120 120 L 300 120"
          fill="none"
          stroke={animStage >= 1 ? "#58D9FF" : "rgba(148,163,184,0.2)"}
          strokeWidth="2.5"
          className={animStage === 1 ? "circuit-signal-path" : ""}
        />

        {/* Wire 2: Fuse Policy Gate -> Allowed Tool (Upper Path) */}
        <path
          d="M 390 100 C 440 100, 480 60, 560 60"
          fill="none"
          stroke={
            mode === "safe"
              ? "#43E0A4"
              : animStage >= 1 && animStage < 3
              ? "#43E0A4"
              : "rgba(148,163,184,0.15)"
          }
          strokeWidth={mode === "safe" ? "2.5" : "2"}
          strokeDasharray={mode === "loop" && animStage >= 3 ? "4 4" : "none"}
        />

        {/* Wire 3: Fuse Policy Gate -> Blocked Invocation (Lower Path) */}
        <path
          d="M 390 140 C 440 140, 480 180, 560 180"
          fill="none"
          stroke={mode === "loop" && animStage >= 2 ? "#FF6B6B" : "rgba(148,163,184,0.15)"}
          strokeWidth={mode === "loop" && animStage >= 2 ? "2.5" : "1.5"}
        />

        {/* --- NODE 1: Model Call (Left) --- */}
        <g className="transition-all duration-500">
          <circle
            cx="100"
            cy="120"
            r="32"
            fill="#15243A"
            stroke="#58D9FF"
            strokeWidth="2"
            filter="url(#glow-cyan)"
          />
          <text
            x="100"
            y="116"
            textAnchor="middle"
            fill="#F5F9FF"
            fontSize="12"
            fontWeight="600"
            fontFamily="Sora"
          >
            Model
          </text>
          <text
            x="100"
            y="132"
            textAnchor="middle"
            fill="#7F91AA"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            propose_call
          </text>
        </g>

        {/* --- NODE 2: FUSE POLICY GATE (Center) --- */}
        <g className="transition-all duration-500">
          {/* Outer Gate Enclosure */}
          <rect
            x="270"
            y="70"
            width="150"
            height="100"
            rx="14"
            fill="#080D18"
            stroke={mode === "loop" && animStage >= 2 ? "#FF6B6B" : "#58D9FF"}
            strokeWidth={mode === "loop" && animStage >= 2 ? "2.5" : "2"}
            filter={mode === "loop" && animStage >= 2 ? "url(#glow-coral)" : "url(#glow-cyan)"}
            className="transition-colors duration-500"
          />
          <text
            x="345"
            y="98"
            textAnchor="middle"
            fill={mode === "loop" && animStage >= 2 ? "#FF8A7A" : "#58D9FF"}
            fontSize="13"
            fontWeight="bold"
            fontFamily="Sora"
            letterSpacing="0.08em"
          >
            FUSE GATE
          </text>
          <text
            x="345"
            y="116"
            textAnchor="middle"
            fill="#B8C5D9"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            beforeCall()
          </text>
          <text
            x="345"
            y="134"
            textAnchor="middle"
            fill={mode === "loop" && animStage >= 2 ? "#FF6B6B" : "#43E0A4"}
            fontSize="10"
            fontWeight="600"
            fontFamily="JetBrains Mono"
          >
            {mode === "loop" && animStage >= 2 ? "VIOLATION DETECTED" : "POLICY CHECK: OK"}
          </text>
        </g>

        {/* --- NODE 3: Allowed Tool Node (Top Right) --- */}
        <g opacity={mode === "loop" && animStage >= 3 ? 0.35 : 1} className="transition-opacity duration-500">
          <circle
            cx="580"
            cy="60"
            r="28"
            fill="#111D31"
            stroke={mode === "safe" ? "#43E0A4" : "#43E0A4"}
            strokeWidth={mode === "safe" ? "2.5" : "1.5"}
          />
          <text
            x="580"
            y="57"
            textAnchor="middle"
            fill="#F5F9FF"
            fontSize="11"
            fontWeight="600"
            fontFamily="Sora"
          >
            Tool
          </text>
          <text
            x="580"
            y="72"
            textAnchor="middle"
            fill="#43E0A4"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            execute()
          </text>
        </g>

        {/* --- NODE 4: Blocked Invocation Node (Bottom Right) --- */}
        <g opacity={mode === "safe" ? 0.25 : 1} className="transition-all duration-500">
          <circle
            cx="580"
            cy="180"
            r="28"
            fill="#15243A"
            stroke={mode === "loop" && animStage >= 3 ? "#FF6B6B" : "rgba(148,163,184,0.3)"}
            strokeWidth={mode === "loop" && animStage >= 3 ? "2.5" : "1.5"}
            filter={mode === "loop" && animStage >= 3 ? "url(#glow-coral)" : "none"}
          />
          {/* Barrier cross lines inside blocked node */}
          <line
            x1="570"
            y1="170"
            x2="590"
            y2="190"
            stroke={mode === "loop" && animStage >= 3 ? "#FF6B6B" : "#7F91AA"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="590"
            y1="170"
            x2="570"
            y2="190"
            stroke={mode === "loop" && animStage >= 3 ? "#FF6B6B" : "#7F91AA"}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <text
            x="580"
            y="222"
            textAnchor="middle"
            fill={mode === "loop" && animStage >= 3 ? "#FF6B6B" : "#7F91AA"}
            fontSize="10"
            fontWeight="bold"
            fontFamily="JetBrains Mono"
          >
            BLOCKED
          </text>
        </g>

        {/* --- AUDIT TIMELINE BADGE (Below Gate) --- */}
        {mode === "loop" && animStage >= 4 && (
          <g className="animate-in fade-in zoom-in-95 duration-500">
            <rect
              x="250"
              y="190"
              width="190"
              height="28"
              rx="6"
              fill="#FF6B6B"
              fillOpacity="0.15"
              stroke="#FF6B6B"
              strokeWidth="1.2"
            />
            <text
              x="345"
              y="208"
              textAnchor="middle"
              fill="#FF8A7A"
              fontSize="10"
              fontWeight="bold"
              fontFamily="JetBrains Mono"
            >
              NEXT INVOCATION BLOCKED
            </text>
          </g>
        )}

        {mode === "safe" && animStage >= 1 && (
          <g className="animate-in fade-in zoom-in-95 duration-500">
            <rect
              x="250"
              y="190"
              width="190"
              height="28"
              rx="6"
              fill="#43E0A4"
              fillOpacity="0.15"
              stroke="#43E0A4"
              strokeWidth="1.2"
            />
            <text
              x="345"
              y="208"
              textAnchor="middle"
              fill="#43E0A4"
              fontSize="10"
              fontWeight="bold"
              fontFamily="JetBrains Mono"
            >
              CALL ALLOWED · PROCEEDING
            </text>
          </g>
        )}
      </svg>

      {/* Narrative Step Explanations Underneath SVG */}
      <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div
          className={`p-2 rounded-[8px] transition-colors ${
            animStage === 1 ? "bg-active/10 text-active border border-active/30" : "text-muted/70"
          }`}
        >
          1. Pre-Call Gate
        </div>
        <div
          className={`p-2 rounded-[8px] transition-colors ${
            animStage >= 2 && animStage < 4
              ? "bg-breaker/10 text-breaker border border-breaker/30"
              : "text-muted/70"
          }`}
        >
          2. Violation Check
        </div>
        <div
          className={`p-2 rounded-[8px] transition-colors ${
            animStage >= 4
              ? "bg-breaker/15 text-breaker font-semibold border border-breaker"
              : "text-muted/70"
          }`}
        >
          3. Next Call Blocked
        </div>
      </div>
    </div>
  );
}
