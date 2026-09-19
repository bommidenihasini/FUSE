"use client";

import { ModeBadge } from "@/components/StatusBadge";
import { BookOpen, HelpCircle } from "lucide-react";
import { useState } from "react";

export function DocsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const faqs = [
    {
      category: "Enforcement",
      q: "What is Fuse?",
      a: "Fuse is a pre-call circuit breaker for autonomous AI agents. It evaluates every next model and tool invocation against 4 hard policies before execution, blocking runaway loops at the boundary.",
    },
    {
      category: "Enforcement",
      q: "Which 4 policies does Fuse evaluate?",
      a: "Max steps (call depth), max estimated cost (USD), max runtime (wall-clock duration), and max repeated normalized actions (duplicate tool arguments).",
    },
    {
      category: "Enforcement",
      q: "Why pre-call enforcement instead of post-call cancellation?",
      a: "Once an API call or model request is sent over the wire, money and time are spent. Intercepting calls pre-call guarantees zero wasted calls upon policy breach.",
    },
    {
      category: "Bedrock",
      q: "What is the status of Amazon Bedrock integration?",
      a: "IAM roles, Bedrock Converse handlers, and model IDs are fully configured. Live Converse calls are labeled 'Live Bedrock pending AWS account verification' until AWS account approval is granted.",
    },
    {
      category: "Billing",
      q: "Why are costs labeled as estimated?",
      a: "AWS reconciles final billing asynchronously. To enforce pre-call cost limits instantaneously, Fuse uses deterministic token pricing models and labels all cost values as estimates.",
    },
  ];

  const categories = ["All", "Enforcement", "Bedrock", "Billing"];

  const filteredFaqs = faqs.filter(
    (f) => activeCategory === "All" || f.category === activeCategory
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-[#58D9FF]" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              TECHNICAL REFERENCE
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Documentation & FAQ
          </h1>
          <p className="mt-1 text-xs font-mono text-zinc-400">
            Core design principles, policy engine rules, and AWS Bedrock integration facts.
          </p>
        </div>

        <ModeBadge />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
              activeCategory === cat
                ? "bg-zinc-700/80 text-white font-bold border border-white/20 shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredFaqs.map((faq) => (
          <div
            key={faq.q}
            className="rounded-2xl border border-white/[0.08] bg-[#202227] p-5 shadow-lg space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#58D9FF]/10 text-[#58D9FF] border border-[#58D9FF]/20">
                  {faq.category}
                </span>
                <HelpCircle size={14} className="text-zinc-500" />
              </div>
              <h3 className="font-display text-sm font-bold text-white leading-snug">
                {faq.q}
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
