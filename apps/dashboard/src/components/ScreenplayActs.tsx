"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { PixelMosaicHover } from "./PixelMosaicHover";
import { ScrollTimeline } from "./ScrollTimeline";
import { FannedProcessCards } from "./FannedProcessCards";
import {
  ArrowRight,
  ShieldAlert,
  X,
} from "lucide-react";

export function ScreenplayActs() {
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);

  return (
    <div className="w-full flex flex-col items-center bg-[#07080B] text-text selection:bg-white selection:text-black relative">
      {/* Background grid lines matching hero */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* ========================================================================= */}
      {/* 1. THE PROBLEM: INTERACTIVE PIXEL SHOWCASE CARD (Matching Image 2)          */}
      {/* ========================================================================= */}
      <section id="failure-modes" className="relative z-10 w-full max-w-[1240px] px-4 sm:px-8 py-10 scroll-mt-6">
        <div className="relative rounded-[32px] sm:rounded-[40px] bg-white text-black overflow-hidden shadow-2xl border border-zinc-200/50 min-h-[460px] sm:min-h-[540px] p-8 sm:p-14 lg:p-16 flex flex-col justify-between">
          {/* Full-bleed interactive Pixel Mosaic Canvas on white background */}
          <div className="absolute inset-0 z-0">
            <PixelMosaicHover cellSize={34} />
          </div>

          {/* Top/Left Typography Header matching Image 2 */}
          <div className="relative z-10 max-w-xl pointer-events-auto">
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-black leading-tight">
              Agents do not always fail loudly.
            </h2>

            {/* SWIPE TO LEARN MORE -> opens modal window */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setIsProblemModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest text-black/80 hover:text-black transition uppercase whitespace-nowrap cursor-pointer group"
              >
                <span>Swipe to learn more</span>
                <ArrowRight size={13} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="h-[1px] w-36 sm:w-64 bg-black/25" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PROBLEM EXPLANATION MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          {/* Backdrop Click to Close */}
          <div
            className="absolute inset-0"
            onClick={() => setIsProblemModalOpen(false)}
          />

          {/* Modal Window Container */}
          <div className="relative z-10 w-full max-w-lg bg-[#0C1017] border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden select-none">
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#3B82F6]/20 blur-3xl pointer-events-none" />

            {/* Header: Title & Close Button */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                    The Unbounded Agent Problem
                  </h3>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    Why autonomous AI workflows fail silently
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProblemModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Problem Points Content */}
            <div className="py-6 space-y-4 font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="font-mono font-bold text-amber-400 text-xs uppercase tracking-wider">
                  01 // Silent Spin Loops
                </div>
                <p>
                  When tools return ambiguous or failing outputs, autonomous agents often retry indefinitely, getting stuck in runaway loops without signaling failure.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="font-mono font-bold text-rose-400 text-xs uppercase tracking-wider">
                  02 // Unbounded Cost & Token Exhaustion
                </div>
                <p>
                  A single runaway retry loop can burn through thousands of API tokens and dollar ceilings before a developer notices.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="font-mono font-bold text-[#00FF88] text-xs uppercase tracking-wider">
                  03 // The Pre-Call Solution
                </div>
                <p>
                  Fuse acts as a circuit breaker by evaluating every proposed call <em>before</em> execution. If a policy boundary is crossed, Fuse blocks the call immediately and emits an EventBridge alert.
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
              <Link
                to="/overview"
                onClick={() => setIsProblemModalOpen(false)}
                className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-mono font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#00FF88]/90 transition shadow-md uppercase tracking-wider"
              >
                <span>TEST IN CONTROL ROOM</span>
                <ArrowRight size={14} />
              </Link>

              <button
                onClick={() => setIsProblemModalOpen(false)}
                className="font-mono text-xs text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCROLL-LINKED STICKY TIMELINE (Green + Black + White)                     */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full px-4 sm:px-8 lg:px-12 py-20">
        <ScrollTimeline />
      </section>

      {/* ========================================================================= */}
      {/* 2. THE SOLUTION: 5-STEP POLICY GATE */}
      {/* ========================================================================= */}
      <section id="pre-call-gate" className="relative z-10 w-full max-w-[1240px] px-6 sm:px-12 py-24 border-t border-white/[0.1] scroll-mt-6">
        <div className="text-left max-w-2xl mb-14">
          <div className="inline-block bg-white text-black font-mono font-bold text-xs px-2.5 py-0.5 tracking-wider uppercase mb-3 shadow-md">
            #02 // PRE-CALL GATE
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            A policy gate before the next call.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed font-sans">
            Every proposed model or tool invocation passes through Fuse before execution. If a policy
            boundary is crossed, Fuse blocks the next invocation immediately.
          </p>
        </div>

        {/* Overlapping Fanned Cards matching reference image */}
        <FannedProcessCards />
      </section>

      {/* ========================================================================= */}
      {/* 3. CLEAN CALL TO ACTION (Direct entry into Control Room)                  */}
      {/* ========================================================================= */}
      <section className="relative z-10 w-full max-w-[1240px] px-6 sm:px-12 py-24 border-t border-white/[0.1]">
        <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-[#0B1220] to-[#040710] p-10 sm:p-16 text-center overflow-hidden shadow-2xl flex flex-col items-center">
          {/* Subtle background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#00FF88]/10 blur-3xl pointer-events-none" />

          <div className="inline-block bg-white text-black font-mono font-bold text-xs px-3 py-1 tracking-wider uppercase mb-5 shadow-lg">
            LIVE DEMO READY
          </div>

          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight max-w-3xl">
            Ready to see the circuit breaker trip live?
          </h2>

          <p className="mt-5 text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed font-sans">
            Run synthetic failure scenarios in the control room and watch Fuse intercept runaway loops before execution.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 z-10">
            <Link
              to="/overview"
              className="group inline-flex items-center text-xs font-mono font-bold tracking-widest uppercase transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-11 h-11 flex items-center justify-center bg-[#00FF88] text-black shadow-md">
                <ArrowRight size={18} strokeWidth={2.5} />
              </div>
              <div className="h-11 px-6 flex items-center justify-center bg-black border border-[#00FF88]/60 text-white tracking-widest text-xs font-mono group-hover:border-[#00FF88]">
                ENTER CONTROL ROOM
              </div>
            </Link>

            <Link
              to="/architecture"
              className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 px-6 h-11 text-xs font-mono text-zinc-300 hover:text-white transition bg-white/[0.04]"
            >
              <span>INSPECT ARCHITECTURE</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
