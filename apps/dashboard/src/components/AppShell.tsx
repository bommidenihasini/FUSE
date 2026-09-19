"use client";

import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpen, Cpu, LayoutDashboard, Scale, Waypoints, Menu, X } from "lucide-react";
import { useState } from "react";
import { ModeBadge } from "./StatusBadge";
import { HealthIndicator } from "./HealthIndicator";
import { cn } from "@/lib/cn";

const links = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/runs", label: "Runs", icon: Waypoints },
  { to: "/policies", label: "Policies", icon: Scale },
  { to: "/architecture", label: "Architecture", icon: Cpu },
  { to: "/docs", label: "Docs", icon: BookOpen },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-sm transition font-medium",
              isActive
                ? "bg-[#15243A] text-active border border-active/30 shadow-[0_0_12px_rgba(88,217,255,0.1)]"
                : "text-muted hover:text-text hover:bg-[#111D31]",
            )
          }
        >
          <link.icon size={16} aria-hidden="true" />
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#121316] text-zinc-100 font-sans selection:bg-white selection:text-black">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#202227] focus:px-4 focus:py-2.5 focus:border focus:border-white/20"
      >
        Skip to content
      </a>

      <div className="mx-auto grid min-h-screen max-w-[1536px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        {/* Desktop Sidebar (Matching Image 2) */}
        <aside className="hidden border-r border-white/[0.08] bg-[#121316] p-5 lg:flex flex-col justify-between">
          <div>
            {/* App Brand Header */}
            <Link to="/" className="flex items-center gap-2.5 group px-2 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] group-hover:scale-110 transition-transform" />
              <span className="font-display text-xl font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                Fuse
              </span>
            </Link>

            <div className="mt-8">
              <NavItems />
            </div>
          </div>

          {/* User Profile / Status at bottom of sidebar matching Image 2 ("Alex A.") */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white leading-tight">Alex A.</span>
                <span className="text-[10px] font-mono text-zinc-500">Fuse Admin</span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-col min-w-0 bg-[#18191C]">
          {/* Top Header Bar */}
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[#121316]/90 backdrop-blur-md px-4 py-3 sm:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white lg:hidden cursor-pointer"
                aria-expanded={open}
                aria-label="Open menu"
                onClick={() => setOpen(true)}
              >
                <Menu size={18} />
              </button>

              <Link to="/" className="lg:hidden flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="font-display text-lg font-bold text-white">Fuse</span>
              </Link>

              <div className="hidden sm:block">
                <ModeBadge />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden xl:inline text-xs font-mono text-zinc-400">
                Live Bedrock pending AWS account verification
              </span>
              <HealthIndicator />
            </div>
          </header>

          {/* Mobile Drawer */}
          {open && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden">
              <div className="h-full w-72 bg-[#121316] border-r border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <Link
                      to="/"
                      onClick={() => setOpen(false)}
                      className="font-display text-lg font-bold flex items-center gap-2 text-white"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>Fuse</span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <NavItems onNavigate={() => setOpen(false)} />
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                    A
                  </div>
                  <div className="text-xs font-medium text-white">Alex A.</div>
                </div>
              </div>
            </div>
          )}

          {/* Page Outlet */}
          <main id="main" className="flex-1 px-4 py-8 sm:px-8 max-w-[1380px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
