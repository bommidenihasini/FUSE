import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

interface FooterPixelWaveProps {
  className?: string;
}

export function FooterPixelWave({ className = "" }: FooterPixelWaveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store pre-generated column noise and accent colors for consistent aesthetic rendering
  const columnDataRef = useRef<
    Array<{
      heightBias: number;
      speedMult: number;
      accentColor: string | null;
      accentOffset: number; // 0 = at crest, 1 = floating 1 above crest, -1 = 1 below crest
      dipBlack: boolean; // black square cutout dipping into white
    }>
  >([]);

  const scrollProgressRef = useRef<number>(0);
  const targetScrollProgressRef = useRef<number>(0);
  const animFrameIdRef = useRef<number>(0);

  const ACCENT_COLORS = [
    "#00C0F0", // Bright Sky Cyan
    "#4ADE80", // Lime / Mint Green
    "#FB7185", // Pink / Coral
    "#FBBF24", // Vibrant Yellow
    "#38BDF8", // Electric Blue
    "#F43F5E", // Hot Rose
  ];

  // Initialize column data
  const initColumns = (cols: number) => {
    const data = [];
    for (let c = 0; c < cols; c++) {
      // Periodic wave combined with pseudo-random jitter
      const wave = Math.sin(c * 0.18) * 1.5 + Math.cos(c * 0.08) * 1.2;
      const jitter = (Math.random() - 0.5) * 2.8;
      const heightBias = wave + jitter;
      const speedMult = 0.8 + Math.random() * 0.5;

      // Accent color probability along the crest (around 30% of columns)
      let accentColor: string | null = null;
      let accentOffset = 0;
      let dipBlack = false;

      if (Math.random() < 0.32) {
        const colorIdx = Math.floor(Math.random() * ACCENT_COLORS.length);
        accentColor = ACCENT_COLORS[colorIdx] ?? "#00C0F0";
        // Accent can sit right at crest, or float 1 square above
        accentOffset = Math.random() < 0.4 ? 1 : Math.random() < 0.2 ? -1 : 0;
      }

      // Occasional black notch dipping into the white grid
      if (!accentColor && Math.random() < 0.12) {
        dipBlack = true;
      }

      data.push({
        heightBias,
        speedMult,
        accentColor,
        accentOffset,
        dipBlack,
      });
    }
    columnDataRef.current = data;
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const cellSize = 18; // Size of each square pixel in px

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const cols = Math.ceil(width / cellSize);
      if (columnDataRef.current.length !== cols) {
        initColumns(cols);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Scroll listener: compute progress (0 when footer enters viewport, 1 when footer is fully visible)
    const handleScroll = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Distance from bottom of viewport to top of footer container
      const visibleDistance = windowHeight - rect.top;
      const totalSpan = rect.height + windowHeight * 0.4;

      const progress = Math.max(0, Math.min(1.2, visibleDistance / totalSpan));
      targetScrollProgressRef.current = progress;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // 60fps Animation Loop with smooth lerp
    let lastRenderTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastRenderTime) / 1000, 0.1);
      lastRenderTime = time;

      // Smooth scroll lerp
      scrollProgressRef.current +=
        (targetScrollProgressRef.current - scrollProgressRef.current) * Math.min(dt * 8, 0.35);

      const ctx = canvas.getContext("2d");
      if (ctx && container) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.width;
        const height = canvas.height;
        const cellPx = cellSize * dpr;
        const cols = Math.ceil(width / cellPx);
        const rows = Math.ceil(height / cellPx);

        ctx.clearRect(0, 0, width, height);

        const progress = scrollProgressRef.current;
        const maxRows = Math.floor(rows * 0.75); // Maximum height in rows the wave can reach

        // 1. Draw light grid lines in the bottom white region
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
        ctx.lineWidth = 1;

        // Draw columns
        for (let c = 0; c < cols; c++) {
          const colInfo = columnDataRef.current[c];
          if (!colInfo) continue;

          // Compute row height for this column based on scroll progress
          // As progress goes from 0 to 1, pixels rise up in a random stepped way
          const rawRowHeight =
            progress * (maxRows * colInfo.speedMult) + colInfo.heightBias * Math.min(progress * 1.5, 1);
          const colHeightRows = Math.max(0, Math.min(rows, Math.floor(rawRowHeight)));

          const colX = Math.floor(c * cellPx);

          // Draw solid white column cells from bottom up to (colHeightRows)
          for (let r = 0; r < colHeightRows; r++) {
            const cellY = height - (r + 1) * cellPx;

            // Check if this cell is an inverted black notch
            if (r === colHeightRows - 1 && colInfo.dipBlack) {
              ctx.fillStyle = "#07080B";
              ctx.fillRect(colX, cellY, cellPx, cellPx);
              continue;
            }

            // Normal white cell
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(colX, cellY, cellPx, cellPx);
            ctx.strokeRect(colX, cellY, cellPx, cellPx);
          }

          // 2. Draw crest pixel blocks (the jagged top edge & colored confetti pixels)
          if (colHeightRows > 0 && progress > 0.05) {
            const crestY = height - (colHeightRows + 1) * cellPx;

            // Optional colored accent pixel sticking up
            if (colInfo.accentColor) {
              const accentY = crestY - colInfo.accentOffset * cellPx;

              if (accentY >= 0 && accentY < height) {
                ctx.fillStyle = colInfo.accentColor;
                ctx.fillRect(colX, accentY, cellPx, cellPx);
                ctx.strokeRect(colX, accentY, cellPx, cellPx);
              }
            } else if (Math.sin(c * 1.3 + progress * 5) > 0.4) {
              // Floating white pixel 1 above the crest for extra jaggedness
              const extraWhiteY = crestY;
              if (extraWhiteY >= 0) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(colX, extraWhiteY, cellPx, cellPx);
                ctx.strokeRect(colX, extraWhiteY, cellPx, cellPx);
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer ref={containerRef} className={`relative w-full overflow-hidden ${className}`}>
      {/* The Scroll-Driven Pixel Wave Canvas */}
      <div className="relative w-full h-[180px] sm:h-[220px] pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      </div>

      {/* Solid White Grid Footer Body matching the bottom of the pixel wave */}
      <div
        className="w-full bg-white text-black px-6 sm:px-12 py-12 selection:bg-black selection:text-white border-t border-black/10 relative z-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "18px 18px",
        }}
      >
        <div className="max-w-[1240px] mx-auto flex flex-col gap-6">
          {/* Main Footer Row: Brand, Tagline, Inline Nav & Back-to-Top */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-black block" />
                <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-black">
                  FUSE
                </span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs font-mono text-black/60 uppercase tracking-wider">
                Runtime Circuit Breaker for Autonomous AI Agents
              </p>
            </div>

            {/* Minimal Inline Navigation Links */}
            <nav className="flex flex-wrap items-center gap-6 font-mono text-xs font-medium text-black/80">
              <Link to="/overview" className="hover:text-black hover:underline transition">
                Control Room
              </Link>
              <Link to="/policies" className="hover:text-black hover:underline transition">
                Policies
              </Link>
              <Link to="/architecture" className="hover:text-black hover:underline transition">
                Architecture
              </Link>
              <Link to="/docs" className="hover:text-black hover:underline transition">
                Docs
              </Link>
            </nav>

            <button
              onClick={scrollToTop}
              className="group self-start md:self-auto inline-flex items-center gap-2 bg-black text-white px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition active:scale-95 shadow-md cursor-pointer"
            >
              <span>TOP</span>
              <ArrowUp size={13} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          {/* Bottom Bar: Copyright and status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-black/50">
            <div>© 2026 FUSE</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>SYSTEM ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
