"use client";

import { useEffect, useRef, useState } from "react";

// Crisp SVG glyphs matching the reference typography with exact serifs & base lines
function Glyph1({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 75 140"
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M 12 40 L 32 18 L 48 18 L 48 118 L 72 118 L 72 136 L 4 136 L 4 118 L 28 118 L 28 40 Z" />
    </svg>
  );
}

function Glyph2({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 95 140"
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M 6 44 C 6 16, 24 4, 48 4 C 74 4, 88 18, 88 38 C 88 58, 68 76, 42 100 L 24 118 L 90 118 L 90 136 L 4 136 L 4 118 L 40 82 C 62 60, 68 48, 68 38 C 68 26, 58 20, 48 20 C 34 20, 24 28, 22 44 Z" />
    </svg>
  );
}

function Glyph3({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 95 140"
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M 8 36 C 10 24, 22 16, 44 16 C 60 16, 72 24, 72 38 C 72 50, 62 58, 48 60 C 66 63, 76 74, 76 92 C 76 112, 60 124, 42 124 C 22 124, 10 112, 8 94 L 26 92 C 28 102, 34 108, 42 108 C 52 108, 58 100, 58 92 C 58 82, 50 76, 38 76 L 28 76 L 28 60 L 38 60 C 48 60, 54 54, 54 44 C 54 36, 48 30, 40 30 C 32 30, 26 34, 24 42 Z" />
    </svg>
  );
}

export function ScrollTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  const [tabWidth, setTabWidth] = useState(130);
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const animFrameIdRef = useRef(0);

  // Responsive tab width calculation for desktop, tablet, and mobile
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setTabWidth(60);
      } else if (w < 1024) {
        setTabWidth(96);
      } else {
        setTabWidth(130);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll listener with 60fps smooth interpolation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const total = container.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const raw = -rect.top / total;
      targetProgressRef.current = Math.min(1, Math.max(0, raw));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Render frame applying translate values
    const tick = () => {
      // Smooth lerp
      const diff = targetProgressRef.current - progressRef.current;
      if (Math.abs(diff) > 0.0005) {
        progressRef.current += diff * 0.18;
      } else {
        progressRef.current = targetProgressRef.current;
      }

      const p = progressRef.current;

      // Card 2 slides in from right between 0.05 and 0.48
      const t1 = Math.min(1, Math.max(0, (p - 0.05) / 0.43));
      // Card 3 slides in from right between 0.52 and 0.95
      const t2 = Math.min(1, Math.max(0, (p - 0.52) / 0.43));

      if (card2Ref.current) {
        card2Ref.current.style.transform = `translateX(${(1 - t1) * 100}%)`;
      }
      if (card3Ref.current) {
        card3Ref.current.style.transform = `translateX(${(1 - t2) * 100}%)`;
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: "260vh" }}
    >
      {/* Pinned Sticky Frame with outer rounded border matching reference */}
      <div className="sticky top-10 sm:top-14 h-[540px] sm:h-[600px] md:h-[660px] w-full max-w-[1240px] mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-black/20 relative bg-[#F2AC37]">
        {/* ========================================================================= */}
        {/* CARD 1 — WARM GOLDEN YELLOW (#F2AC37)                                     */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 bg-[#F2AC37] z-10 overflow-hidden select-none">
          {/* Giant Number 1 positioned in the first tab slice */}
          <div
            className="absolute left-0 bottom-8 sm:bottom-12 md:bottom-14 flex items-end justify-center pointer-events-none"
            style={{ width: `${tabWidth}px` }}
          >
            <Glyph1 className="h-[140px] sm:h-[180px] md:h-[220px] w-auto text-[#111111]" />
          </div>

          {/* Card 1 Typography Content (neatly covered when Card 2 enters) */}
          <div
            className="absolute bottom-8 sm:bottom-12 md:bottom-14 pr-6 sm:pr-10 max-w-lg select-text"
            style={{ left: `${tabWidth + 20}px` }}
          >
            <h3 className="font-sans font-bold text-2xl sm:text-3xl md:text-[32px] text-[#111111] mb-2 sm:mb-3 leading-tight tracking-tight">
              Runaway Recursive Loops
            </h3>
            <p className="font-sans font-medium text-sm sm:text-base md:text-[17px] text-[#181818] leading-relaxed max-w-md">
              The same action repeats because tool results remain ambiguous. The model cannot discern whether to proceed or retry, resulting in an infinite execution loop.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2 — CORAL RED (#EE4D3B) (Slides in from Right)                      */}
        {/* ========================================================================= */}
        <div
          ref={card2Ref}
          className="absolute top-0 bottom-0 right-0 bg-[#EE4D3B] z-20 overflow-hidden shadow-[-16px_0_35px_rgba(0,0,0,0.3)] will-change-transform select-none"
          style={{
            left: `${tabWidth}px`,
            transform: "translateX(100%)",
          }}
        >
          {/* Giant Number 2 positioned in Card 2's exposed tab slice */}
          <div
            className="absolute left-0 bottom-8 sm:bottom-12 md:bottom-14 flex items-end justify-center pointer-events-none"
            style={{ width: `${tabWidth}px` }}
          >
            <Glyph2 className="h-[140px] sm:h-[180px] md:h-[220px] w-auto text-[#111111]" />
          </div>

          {/* Card 2 Typography Content (neatly covered when Card 3 enters) */}
          <div
            className="absolute bottom-8 sm:bottom-12 md:bottom-14 pr-6 sm:pr-10 max-w-lg select-text"
            style={{ left: `${tabWidth + 20}px` }}
          >
            <h3 className="font-sans font-bold text-2xl sm:text-3xl md:text-[32px] text-[#111111] mb-2 sm:mb-3 leading-tight tracking-tight">
              Cascading Retry Storms
            </h3>
            <p className="font-sans font-medium text-sm sm:text-base md:text-[17px] text-[#181818] leading-relaxed max-w-md">
              A failing tool keeps getting called instead of stopping safely. Micro-timeouts and upstream errors cause cascades of redundant retry storms that exhaust step budgets.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3 — FOREST GREEN (#0E7E45) (Slides in from Right)                    */}
        {/* ========================================================================= */}
        <div
          ref={card3Ref}
          className="absolute top-0 bottom-0 right-0 bg-[#0E7E45] z-30 overflow-hidden shadow-[-16px_0_35px_rgba(0,0,0,0.3)] will-change-transform select-none"
          style={{
            left: `${tabWidth * 2}px`,
            transform: "translateX(100%)",
          }}
        >
          {/* Giant Number 3 positioned in Card 3's exposed tab slice */}
          <div
            className="absolute left-0 bottom-8 sm:bottom-12 md:bottom-14 flex items-end justify-center pointer-events-none"
            style={{ width: `${tabWidth}px` }}
          >
            <Glyph3 className="h-[140px] sm:h-[180px] md:h-[220px] w-auto text-[#111111]" />
          </div>

          {/* Card 3 Typography Content (Top Card — always visible in final state) */}
          <div
            className="absolute bottom-8 sm:bottom-12 md:bottom-14 pr-6 sm:pr-10 max-w-lg select-text"
            style={{ left: `${tabWidth + 20}px` }}
          >
            <h3 className="font-sans font-bold text-2xl sm:text-3xl md:text-[32px] text-[#111111] mb-2 sm:mb-3 leading-tight tracking-tight">
              Runaway Cost Burn
            </h3>
            <p className="font-sans font-medium text-sm sm:text-base md:text-[17px] text-[#181818] leading-relaxed max-w-md">
              Useful work concludes, but model calls continue unchecked. Accumulating prompt histories multiply token consumption, creating silent billing spikes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
