"use client";

import { Link } from "react-router-dom";
import { ArrowRight, ArrowDown } from "lucide-react";

interface HeroRevealProps {
  onExploreClick?: () => void;
}

export function HeroReveal({ onExploreClick }: HeroRevealProps) {
  return (
    <div className="relative min-h-screen w-full bg-[#07080B] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Outer ambient blur / monitor glow matching the photograph */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-[#06B6D4]/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 bg-[#EC4899]/15 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-[100px]" />

      {/* Grid Pattern Background across the entire viewport */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* ========================================================================= */}
      {/* TOP-RIGHT STEPPED GRADIENT CORNER                                          */}
      {/* ========================================================================= */}
      <div className="absolute top-0 right-0 w-[288px] h-[288px] pointer-events-none z-10 hidden sm:block">
        <svg className="w-full h-full" viewBox="0 0 288 288" fill="none">
          <defs>
            <linearGradient id="topRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="35%" stopColor="#8B5CF6" />
              <stop offset="70%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
          {/* Stepped stair polygon */}
          <path
            d="M 0 0 L 288 0 L 288 288 L 216 288 L 216 216 L 144 216 L 144 144 L 72 144 L 72 72 L 0 72 Z"
            fill="url(#topRightGrad)"
          />
          {/* Overlay grid lines */}
          <line x1="72" y1="0" x2="72" y2="72" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="144" y1="0" x2="144" y2="144" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="216" y1="0" x2="216" y2="216" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="0" y1="72" x2="288" y2="72" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="72" y1="144" x2="288" y2="144" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="144" y1="216" x2="288" y2="216" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM-LEFT STEPPED GRADIENT CORNER                                       */}
      {/* ========================================================================= */}
      <div className="absolute bottom-0 left-0 w-[288px] h-[288px] pointer-events-none z-10 hidden sm:block">
        <svg className="w-full h-full" viewBox="0 0 288 288" fill="none">
          <defs>
            <linearGradient id="bottomLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="35%" stopColor="#3B82F6" />
              <stop offset="70%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          {/* Stepped stair polygon */}
          <path
            d="M 0 0 L 72 0 L 72 72 L 144 72 L 144 144 L 216 144 L 216 216 L 288 216 L 288 288 L 0 288 Z"
            fill="url(#bottomLeftGrad)"
          />
          {/* Overlay grid lines */}
          <line x1="72" y1="0" x2="72" y2="288" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="144" y1="72" x2="144" y2="288" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="216" y1="144" x2="216" y2="288" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
          <line x1="0" y1="216" x2="216" y2="216" stroke="rgba(7,8,11,0.6)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* CENTER FOCAL HERO: Brutalist Box Typography, Paragraph & Compound CTA      */}
      {/* ========================================================================= */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-6 sm:px-12 my-auto flex flex-col items-start justify-center">
        {/* Brutalist Architectural Title Container */}
        <div className="flex flex-col items-start">
          {/* Line 1: Fuse Box */}
          <div className="bg-white text-black font-display font-black text-6xl sm:text-8xl md:text-9xl lg:text-[130px] px-5 sm:px-8 py-1 sm:py-2 leading-[0.92] tracking-tight shadow-2xl">
            Fuse
          </div>

          {/* Line 2: Breaker. Box (Pixelated Bitmap Font) */}
          <div className="bg-white text-black font-pixel font-bold text-5xl sm:text-7xl md:text-8xl lg:text-[120px] px-5 sm:px-8 py-1 sm:py-2 leading-[0.92] tracking-tight -mt-1 sm:-mt-2 shadow-2xl">
            Breaker.
          </div>
        </div>

        {/* Description & Compound CTA Button Row */}
        <div className="mt-8 sm:mt-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Reduced concise paragraph */}
          <p className="text-zinc-400 text-sm sm:text-base font-sans leading-relaxed max-w-sm">
            Pre-call circuit breaker for autonomous AI agents. Blocks runaway loops before execution.
          </p>

          {/* Compound Gradient CTA Button (Matching [➔ REGISTER] from photo) */}
          <Link
            to="/overview"
            className="group inline-flex items-center self-start md:self-end text-xs font-mono font-bold tracking-widest uppercase transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Square Gradient Icon Box */}
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-[#F472B6] via-[#FB7185] to-[#FDA4AF] text-black shadow-md group-hover:brightness-110 transition">
              <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
            {/* Outlined Action Label Box */}
            <div className="h-10 px-5 flex items-center justify-center bg-black/80 border border-white/40 text-white tracking-widest text-[11px] font-mono group-hover:border-white group-hover:bg-white/10 transition">
              ENTER CONTROL ROOM
            </div>
          </Link>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM TICKER / SCROLL PROMPT                                             */}
      {/* ========================================================================= */}
      <footer className="relative z-20 w-full px-6 sm:px-12 pb-6 flex items-center justify-between text-xs font-mono text-zinc-500">
        <button
          onClick={onExploreClick}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <span>EXPLORE SPECS & POLICIES</span>
          <ArrowDown size={13} className="animate-bounce" />
        </button>

        <div className="hidden sm:flex items-center gap-4">
          <span>AWS BEDROCK</span>
          <span>DYNAMODB</span>
          <span>EVENTBRIDGE</span>
        </div>
      </footer>
    </div>
  );
}
