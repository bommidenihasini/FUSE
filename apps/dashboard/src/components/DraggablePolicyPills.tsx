"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw, Sparkles } from "lucide-react";

interface PillDefinition {
  id: string;
  icon: string;
  label: string;
  bg: string;
  shadowColor: string;
  textColor: string;
  defaultOffsetX: number; // offset from center in px
  defaultOffsetY: number;
  defaultRotate: number;
  scatterOffsetX: number;
  scatterOffsetY: number;
}

const PILLS: PillDefinition[] = [
  {
    id: "pre-call",
    icon: "◆",
    label: "pre-call gate",
    bg: "#EE5343",
    shadowColor: "#B83224",
    textColor: "#6E160D",
    defaultOffsetX: 0,
    defaultOffsetY: 40,
    defaultRotate: 3,
    scatterOffsetX: -240,
    scatterOffsetY: 60,
  },
  {
    id: "max-steps",
    icon: "◇",
    label: "max steps",
    bg: "#F5B838",
    shadowColor: "#BF8A17",
    textColor: "#5E4000",
    defaultOffsetX: 25,
    defaultOffsetY: -5,
    defaultRotate: -6,
    scatterOffsetX: 230,
    scatterOffsetY: 120,
  },
  {
    id: "cost-cap",
    icon: "◎",
    label: "cost budget",
    bg: "#FA7B38",
    shadowColor: "#C65516",
    textColor: "#632400",
    defaultOffsetX: -30,
    defaultOffsetY: -30,
    defaultRotate: 8,
    scatterOffsetX: 180,
    scatterOffsetY: -120,
  },
  {
    id: "loop-breaker",
    icon: "✦",
    label: "loop breaker",
    bg: "#5359A8",
    shadowColor: "#3A3F7A",
    textColor: "#1B1F54",
    defaultOffsetX: -60,
    defaultOffsetY: 15,
    defaultRotate: -10,
    scatterOffsetX: -140,
    scatterOffsetY: -80,
  },
  {
    id: "runtime-limit",
    icon: "✎",
    label: "runtime limit",
    bg: "#EC6E9D",
    shadowColor: "#B7456F",
    textColor: "#631535",
    defaultOffsetX: -40,
    defaultOffsetY: -15,
    defaultRotate: 4,
    scatterOffsetX: -260,
    scatterOffsetY: 130,
  },
  {
    id: "eventbridge",
    icon: "↗",
    label: "eventbridge",
    bg: "#6CB87C",
    shadowColor: "#488E57",
    textColor: "#14481F",
    defaultOffsetX: 45,
    defaultOffsetY: 25,
    defaultRotate: -4,
    scatterOffsetX: 0,
    scatterOffsetY: 120,
  },
  {
    id: "audit-ledger",
    icon: "◎",
    label: "audit ledger",
    bg: "#48BEE0",
    shadowColor: "#298DAA",
    textColor: "#0A4354",
    defaultOffsetX: 60,
    defaultOffsetY: -35,
    defaultRotate: 12,
    scatterOffsetX: 260,
    scatterOffsetY: -30,
  },
  {
    id: "before-call",
    icon: "✦",
    label: "beforeCall()",
    bg: "#A074E8",
    shadowColor: "#7147B5",
    textColor: "#37176E",
    defaultOffsetX: -10,
    defaultOffsetY: -45,
    defaultRotate: -7,
    scatterOffsetX: -20,
    scatterOffsetY: -130,
  },
];

interface PillState {
  x: number;
  y: number;
  rotate: number;
  zIndex: number;
}

export function DraggablePolicyPills() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, PillState>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    pillStartX: number;
    pillStartY: number;
  } | null>(null);

  const zIndexCounter = useRef<number>(100);

  // Stack all pills in center cluster (like Image 1)
  const resetToPile = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const initial: Record<string, PillState> = {};
    PILLS.forEach((p, idx) => {
      initial[p.id] = {
        x: Math.max(20, Math.min(rect.width - 160, centerX + p.defaultOffsetX - 70)),
        y: Math.max(20, Math.min(rect.height - 70, centerY + p.defaultOffsetY - 25)),
        rotate: p.defaultRotate,
        zIndex: idx + 10,
      };
    });
    setPositions(initial);
  }, []);

  // Scatter pills across canvas (like Image 2)
  const scatterPills = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scattered: Record<string, PillState> = {};
    PILLS.forEach((p, idx) => {
      scattered[p.id] = {
        x: Math.max(30, Math.min(rect.width - 180, centerX + p.scatterOffsetX - 70)),
        y: Math.max(30, Math.min(rect.height - 80, centerY + p.scatterOffsetY - 25)),
        rotate: p.defaultRotate * 1.5,
        zIndex: idx + 10,
      };
    });
    setPositions(scattered);
  }, []);

  // Initialize on mount and window resize
  useEffect(() => {
    resetToPile();

    const handleResize = () => {
      resetToPile();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resetToPile]);

  // Pointer down handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);

    zIndexCounter.current += 1;
    const current = positions[id] || { x: 0, y: 0, rotate: 0, zIndex: 10 };

    setPositions((prev) => ({
      ...prev,
      [id]: {
        ...current,
        zIndex: zIndexCounter.current,
      },
    }));

    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      pillStartX: current.x,
      pillStartY: current.y,
    };

    setActiveDragId(id);
  };

  // Pointer move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { id, startX, startY, pillStartX, pillStartY } = dragRef.current;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const newX = Math.max(10, Math.min(rect.width - 180, pillStartX + dx));
    const newY = Math.max(10, Math.min(rect.height - 75, pillStartY + dy));

    setPositions((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          x: newX,
          y: newY,
        },
      };
    });
  };

  // Pointer up handler
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture already released
      }
      dragRef.current = null;
      setActiveDragId(null);
    }
  };

  return (
    <div className="w-full">
      {/* Interactive Drag & Drop Sandbox */}
      <div
        ref={containerRef}
        className="relative w-full h-[480px] sm:h-[540px] md:h-[580px] rounded-3xl border border-white/10 bg-[#080B14] overflow-hidden shadow-2xl select-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
          {/* Instruction Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-mono text-xs text-zinc-300 pointer-events-auto shadow-md">
            <span className="text-[#00FF88] text-sm">✦</span>
            <span>Drag & move policy tags anywhere</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={resetToPile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-white/10 border border-white/15 text-xs font-mono text-zinc-300 hover:text-white transition shadow-sm cursor-pointer"
              title="Stack tags back into center pile"
            >
              <RotateCcw size={12} />
              <span>Stack Pile</span>
            </button>
            <button
              onClick={scatterPills}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-white/10 border border-white/15 text-xs font-mono text-zinc-300 hover:text-white transition shadow-sm cursor-pointer"
              title="Scatter tags across canvas"
            >
              <Sparkles size={12} />
              <span>Scatter</span>
            </button>
          </div>
        </div>

        {/* Draggable 3D Tactile Pills */}
        {PILLS.map((pill) => {
          const state = positions[pill.id] || {
            x: 0,
            y: 0,
            rotate: pill.defaultRotate,
            zIndex: 10,
          };

          const isDragging = activeDragId === pill.id;

          return (
            <div
              key={pill.id}
              onPointerDown={(e) => handlePointerDown(e, pill.id)}
              className="absolute inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-[20px] font-sans font-bold text-base sm:text-lg tracking-tight select-none touch-none will-change-transform"
              style={{
                left: `${state.x}px`,
                top: `${state.y}px`,
                backgroundColor: pill.bg,
                color: pill.textColor,
                zIndex: state.zIndex,
                transform: `rotate(${state.rotate}deg) ${isDragging ? "scale(1.08)" : "scale(1)"}`,
                boxShadow: isDragging
                  ? `0 14px 0 ${pill.shadowColor}, 0 24px 40px rgba(0, 0, 0, 0.5)`
                  : `0 8px 0 ${pill.shadowColor}, 0 14px 25px rgba(0, 0, 0, 0.35)`,
                cursor: isDragging ? "grabbing" : "grab",
                transition: isDragging
                  ? "transform 0.05s ease-out, box-shadow 0.1s ease"
                  : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease",
              }}
            >
              {/* Icon */}
              <span className="text-base sm:text-lg font-black leading-none opacity-90">
                {pill.icon}
              </span>
              {/* Label */}
              <span className="font-extrabold whitespace-nowrap">
                {pill.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
