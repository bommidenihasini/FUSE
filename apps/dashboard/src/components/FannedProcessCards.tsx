import { useState } from "react";
import { ShieldAlert, Scale, Zap, Database, Bell } from "lucide-react";

interface FannedCard {
  id: string;
  step: string;
  badge: string;
  title: string;
  description: string;
  bg: string;
  textColor: string;
  subColor: string;
  icon: React.ElementType;
  defaultRotate: number;
  defaultY: number;
}

const CARDS: FannedCard[] = [
  {
    id: "step-1",
    step: "01",
    badge: "INTERCEPTION",
    title: "Pre-Call Interception",
    description:
      "Intercepts every model and tool call before execution so no unauthorized API calls occur.",
    bg: "#F97340",
    textColor: "text-white",
    subColor: "text-white/80",
    icon: ShieldAlert,
    defaultRotate: -6,
    defaultY: 14,
  },
  {
    id: "step-2",
    step: "02",
    badge: "POLICY ENGINE",
    title: "Policy Evaluation",
    description:
      "Evaluates 4 inviolable policies: max steps, max cost, max runtime, and repeated action counts.",
    bg: "#F5B838",
    textColor: "text-[#111111]",
    subColor: "text-[#111111]/75",
    icon: Scale,
    defaultRotate: -3,
    defaultY: 6,
  },
  {
    id: "step-3",
    step: "03",
    badge: "CIRCUIT GATE",
    title: "Circuit Breaker",
    description:
      "Trips immediately on policy breach, preventing the next call and stopping runaway loops.",
    bg: "#6F9575",
    textColor: "text-white",
    subColor: "text-white/80",
    icon: Zap,
    defaultRotate: 0,
    defaultY: 0,
  },
  {
    id: "step-4",
    step: "04",
    badge: "AUDIT LEDGER",
    title: "DynamoDB Audit",
    description:
      "Persists immutable run state, action signatures, and decision details for full auditability.",
    bg: "#3B82F6",
    textColor: "text-white",
    subColor: "text-white/80",
    icon: Database,
    defaultRotate: 3,
    defaultY: 6,
  },
  {
    id: "step-5",
    step: "05",
    badge: "AWS EVENTS",
    title: "EventBridge Alert",
    description:
      "Publishes BreakerTripped events to EventBridge for instant system notification.",
    bg: "#E2E693",
    textColor: "text-[#111111]",
    subColor: "text-[#111111]/75",
    icon: Bell,
    defaultRotate: 6,
    defaultY: 14,
  },
];

export function FannedProcessCards() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* Outer Card Showcase with clean gallery backdrop */}
      <div className="relative w-full rounded-3xl bg-[#F8F9FA] border border-black/10 shadow-[0_25px_70px_rgba(0,0,0,0.5)] py-16 sm:py-20 px-4 sm:px-8 overflow-hidden select-none">
        {/* Horizontal scroll support for smaller screens */}
        <div className="w-full overflow-x-auto scrollbar-none flex items-center justify-center py-4">
          {/* Fanned Cards Horizontal Cluster */}
          <div className="relative flex items-center justify-center min-w-[760px] md:min-w-[900px] h-[420px]">
            {CARDS.map((card, idx) => {
              const isHovered = hoveredId === card.id;
              const IconComp = card.icon;

              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredId(card.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative w-[230px] sm:w-[250px] md:w-[265px] h-[340px] sm:h-[370px] rounded-[24px] sm:rounded-[28px] p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-[0_14px_35px_rgba(0,0,0,0.18)] ${
                    idx !== 0 ? "-ml-12 sm:-ml-16 md:-ml-20" : ""
                  }`}
                  style={{
                    backgroundColor: card.bg,
                    transform: isHovered
                      ? "translateY(-28px) rotate(0deg) scale(1.05)"
                      : `translateY(${card.defaultY}px) rotate(${card.defaultRotate}deg)`,
                    zIndex: isHovered ? 50 : idx * 10,
                    boxShadow: isHovered
                      ? "0 30px 60px -10px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.4)"
                      : "0 14px 35px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Top Row: Step Number & Icon Badge */}
                  <div className="w-full flex items-center justify-between">
                    <span className={`font-mono text-xs font-bold ${card.subColor}`}>
                      STEP {card.step}
                    </span>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shrink-0">
                      <IconComp size={18} className={card.textColor} />
                    </div>
                  </div>

                  {/* Center Main Description Copy */}
                  <div className="my-auto py-2">
                    <p
                      className={`font-sans font-medium text-sm sm:text-[15px] leading-relaxed tracking-normal ${card.textColor}`}
                    >
                      {card.description}
                    </p>
                  </div>

                  {/* Bottom Title and Badge */}
                  <div className="pt-3 border-t border-black/10 flex items-center justify-between">
                    <h5
                      className={`font-sans font-bold text-sm sm:text-base leading-tight ${card.textColor}`}
                    >
                      {card.title}
                    </h5>
                    <span className={`font-mono text-[10px] uppercase font-semibold ${card.subColor}`}>
                      {card.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
