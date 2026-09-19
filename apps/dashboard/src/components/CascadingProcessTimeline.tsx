"use client";

import { useState } from "react";

interface StepData {
  number: string;
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  metaKey: string;
  metaValue: string;
  x: number; // horizontal center in px
  y: number; // vertical position of the circle node in px
}

const STEPS: StepData[] = [
  {
    number: "01",
    title: "Propose Call",
    badge: "Caller Intent",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Agent runtime proposes next model or tool action with structured arguments before execution.",
    metaKey: "payload",
    metaValue: "{ action, args }",
    x: 120,
    y: 70,
  },
  {
    number: "02",
    title: "Evaluate Policy",
    badge: "beforeCall()",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Fuse runs deterministic checks against active run state: steps, cost, time, and repetition count.",
    metaKey: "policies",
    metaValue: "4 active gates",
    x: 360,
    y: 130,
  },
  {
    number: "03",
    title: "Allow or Block",
    badge: "Hard Gate",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Execution proceeds only if all policies pass. If any threshold is breached, call is blocked immediately.",
    metaKey: "decision",
    metaValue: "ALLOW | BLOCK",
    x: 600,
    y: 190,
  },
  {
    number: "04",
    title: "Persist Decision",
    badge: "Audit Ledger",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Decision, normalized action signature, and estimated cost logged immutably into DynamoDB.",
    metaKey: "ledger",
    metaValue: "DynamoDB PK/SK",
    x: 840,
    y: 250,
  },
  {
    number: "05",
    title: "Publish Event",
    badge: "EventBridge",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "BreakerTripped event emitted to AWS EventBridge architecture for automated team alerts and triggers.",
    metaKey: "event",
    metaValue: "BreakerTripped",
    x: 1080,
    y: 310,
  },
];

export function CascadingProcessTimeline() {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Arching wave SVG path passing through each node with graceful crests
  const wavePath = `
    M 120 70
    C 200 25, 280 40, 360 130
    C 440 85, 520 100, 600 190
    C 680 145, 760 160, 840 250
    C 920 205, 1000 220, 1080 310
  `;

  // Glowing Green Highlight line across the enforcement transition (Node 03 to 04)
  const activeHighlightPath = `
    M 600 190
    C 680 145, 760 160, 840 250
  `;

  return (
    <div className="w-full">
      {/* Outer Card with pristine off-white gallery background matching Image 2 */}
      <div className="relative w-full rounded-3xl bg-[#F8F9FA] border border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Horizontal scroll container for responsive mobile/tablet experience */}
        <div className="w-full overflow-x-auto scrollbar-none py-10 px-4 sm:px-8">
          <div className="relative min-w-[1200px] h-[590px] mx-auto select-none">
            {/* SVG Connecting Arch Wave Line */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 1200 590"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Subtle background curved wave path */}
              <path
                d={wavePath}
                stroke="#D1D5DB"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Glowing Emerald Green highlight line between Node 03 and 04 */}
              <path
                d={activeHighlightPath}
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            </svg>

            {/* Nodes and Cascading Pure Typography Cards */}
            {STEPS.map((step) => {
              const isHovered = activeStep === step.number;

              return (
                <div key={step.number}>
                  {/* Circular Node Pill directly on the curved arch line */}
                  <div
                    className={`absolute w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 z-20 cursor-pointer ${
                      isHovered
                        ? "bg-[#10B981] text-white border-[#10B981] scale-125 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        : "bg-white text-zinc-700 border-zinc-300 shadow-sm hover:border-zinc-500"
                    }`}
                    style={{
                      left: `${step.x}px`,
                      top: `${step.y}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseEnter={() => setActiveStep(step.number)}
                    onMouseLeave={() => setActiveStep(null)}
                  >
                    {step.number}
                  </div>

                  {/* Cascading High-Definition Typography Card hanging below the node */}
                  <div
                    className={`absolute w-[220px] p-5 sm:p-6 rounded-[24px] bg-white border border-zinc-200/90 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer group z-10 text-left flex flex-col justify-between ${
                      isHovered
                        ? "-translate-y-2 shadow-[0_20px_45px_rgba(0,0,0,0.14)] border-[#10B981]"
                        : "hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.1)] hover:border-zinc-400"
                    }`}
                    style={{
                      left: `${step.x}px`,
                      top: `${step.y + 36}px`,
                      transform: isHovered
                        ? "translate(-50%, -8px)"
                        : "translate(-50%, 0)",
                      minHeight: "205px",
                    }}
                    onMouseEnter={() => setActiveStep(step.number)}
                    onMouseLeave={() => setActiveStep(null)}
                  >
                    <div>
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          STEP {step.number}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.badgeColor}`}
                        >
                          {step.badge}
                        </span>
                      </div>

                      {/* High-Definition Title */}
                      <h4 className="font-display font-bold text-lg sm:text-[19px] text-[#111111] leading-tight mb-2 tracking-tight group-hover:text-[#10B981] transition-colors">
                        {step.title}
                      </h4>

                      {/* Detailed Explanatory Copy */}
                      <p className="font-sans text-xs text-zinc-600 leading-relaxed font-normal">
                        {step.desc}
                      </p>
                    </div>

                    {/* Bottom Technical Key-Value Spec */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-zinc-400">{step.metaKey}</span>
                      <span className="font-semibold text-zinc-800">
                        {step.metaValue}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="w-full text-center py-2.5 bg-zinc-100/80 border-t border-zinc-200/60 lg:hidden text-[11px] font-mono text-zinc-500">
          ← Scroll horizontally to view full process flow →
        </div>
      </div>
    </div>
  );
}
