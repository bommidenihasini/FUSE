"use client";

import { useEffect, useRef } from "react";

interface PixelMosaicHoverProps {
  className?: string;
  cellSize?: number;
}

export function PixelMosaicHover({ className = "", cellSize = 36 }: PixelMosaicHoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Grid state stored in ref for 60fps canvas render loop
  const gridRef = useRef<{
    cols: number;
    rows: number;
    cells: Float32Array; // current opacity (0 = mask, 1 = revealed)
    targetCells: Float32Array; // target opacity
    baseMask: Uint8Array; // 0 = allowed, 1 = protected text area
  }>({
    cols: 0,
    rows: 0,
    cells: new Float32Array(0),
    targetCells: new Float32Array(0),
    baseMask: new Uint8Array(0),
  });

  const mousePosRef = useRef<{ x: number; y: number; active: boolean; lastMove: number }>({
    x: -100,
    y: -100,
    active: false,
    lastMove: 0,
  });

  const animFrameIdRef = useRef<number>(0);

  // Generate the vibrant organic blue-green texture on white canvas matching Image 2
  const generateTexture = (width: number, height: number) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return offscreen;

    // Base clean white background fill matching Image 2
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Natural Greens (Center and Middle-Left)
    const grad1 = ctx.createRadialGradient(
      width * 0.45,
      height * 0.5,
      width * 0.05,
      width * 0.45,
      height * 0.5,
      width * 0.55
    );
    grad1.addColorStop(0, "#4A8B57");
    grad1.addColorStop(0.35, "#52B788");
    grad1.addColorStop(0.7, "#2D6A4F");
    grad1.addColorStop(1, "transparent");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // Layer 2: Moss & Sage Greens (Top-Center & Center)
    const grad2 = ctx.createRadialGradient(
      width * 0.55,
      height * 0.4,
      width * 0.05,
      width * 0.55,
      height * 0.4,
      width * 0.45
    );
    grad2.addColorStop(0, "#76B041");
    grad2.addColorStop(0.4, "#95D5B2");
    grad2.addColorStop(0.8, "#38A3A5");
    grad2.addColorStop(1, "transparent");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    // Layer 3: Sky & Azure Blues (Right side)
    const grad3 = ctx.createRadialGradient(
      width * 0.8,
      height * 0.5,
      width * 0.08,
      width * 0.8,
      height * 0.5,
      width * 0.55
    );
    grad3.addColorStop(0, "#42A5F5");
    grad3.addColorStop(0.35, "#1E88E5");
    grad3.addColorStop(0.7, "#1976D2");
    grad3.addColorStop(1, "transparent");
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, width, height);

    // Layer 4: Cyan & Turquoise Highlights (Bottom-Right)
    const grad4 = ctx.createRadialGradient(
      width * 0.7,
      height * 0.75,
      width * 0.05,
      width * 0.7,
      height * 0.75,
      width * 0.4
    );
    grad4.addColorStop(0, "#48CAE4");
    grad4.addColorStop(0.4, "#0096C7");
    grad4.addColorStop(0.8, "transparent");
    ctx.fillStyle = grad4;
    ctx.fillRect(0, 0, width, height);

    // Layer 5: Soft Cobalt Blue Spots (Top-Right)
    const grad5 = ctx.createRadialGradient(
      width * 0.88,
      height * 0.25,
      width * 0.05,
      width * 0.88,
      height * 0.25,
      width * 0.35
    );
    grad5.addColorStop(0, "#64B5F6");
    grad5.addColorStop(0.5, "#1E88E5");
    grad5.addColorStop(1, "transparent");
    ctx.fillStyle = grad5;
    ctx.fillRect(0, 0, width, height);

    return offscreen;
  };

  // Initialize or re-randomize the grid with reduced pixel density and protected text zone
  const randomizeGrid = (cols: number, rows: number, fullReset = false) => {
    const total = cols * rows;
    const cells = fullReset ? new Float32Array(total) : gridRef.current.cells;
    const targetCells = new Float32Array(total);
    const baseMask = new Uint8Array(total);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;

        // Normalized coordinates (0 to 1)
        const nx = c / cols;
        const ny = r / rows;

        let prob: number;

        if (nx < 0.46) {
          // Protected text area: no pixels under the text so it's clean and legible
          prob = 0;
          baseMask[idx] = 1;
        } else {
          // Right side: reduced density for clean, airy pixel mosaic
          prob = 0.32;
          if (nx > 0.6 && nx < 0.85 && ny > 0.2 && ny < 0.8) {
            prob = 0.42; // subtle concentration in center-right
          }
        }

        const isRevealed = Math.random() < prob;
        targetCells[idx] = isRevealed ? 1 : 0;
        if (fullReset) {
          cells[idx] = isRevealed ? 1 : 0;
        }
      }
    }

    gridRef.current = {
      cols,
      rows,
      cells,
      targetCells,
      baseMask,
    };
  };

  // Resize and setup
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

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

      textureCanvasRef.current = generateTexture(width * dpr, height * dpr);

      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);

      randomizeGrid(cols, rows, true);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [cellSize]);

  // Main 60fps render and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { cols, rows, cells, targetCells } = gridRef.current;
      const texture = textureCanvasRef.current;

      if (cols > 0 && rows > 0 && texture) {
        const cellPx = cellSize * dpr;
        const total = cols * rows;

        // Smooth interpolation for snappy digital pixel dissolve
        for (let i = 0; i < total; i++) {
          const target = targetCells[i] ?? 0;
          const current = cells[i] ?? 0;
          const diff = target - current;
          if (Math.abs(diff) > 0.01) {
            cells[i] = current + diff * Math.min(dt * 14, 0.4);
          } else {
            cells[i] = target;
          }
        }

        // Ambient occasional flicker
        if (Math.random() < 0.08) {
          const randIdx = Math.floor(Math.random() * total);
          if ((gridRef.current.baseMask[randIdx] ?? 0) === 0) {
            const cur = targetCells[randIdx] ?? 0;
            targetCells[randIdx] = cur > 0.5 ? 0 : 1;
          }
        }

        // Clear canvas and fill with clean white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw individual pixel tiles
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const opacity = cells[idx] ?? 0;

            if (opacity > 0.02) {
              const x = Math.floor(c * cellPx);
              const y = Math.floor(r * cellPx);
              const w = Math.ceil(cellPx);
              const h = Math.ceil(cellPx);

              ctx.save();
              ctx.globalAlpha = opacity;

              // Clip to square tile and stamp underlying texture
              ctx.beginPath();
              ctx.rect(x + 1, y + 1, w - 2, h - 2);
              ctx.clip();
              ctx.drawImage(texture, 0, 0);

              // Subtle clean border matching Image 2
              ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
              ctx.lineWidth = 1;
              ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

              ctx.restore();
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [cellSize]);

  // Interactive mouse move: randomly scramble nearby and distant cells
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePosRef.current = {
      x,
      y,
      active: true,
      lastMove: performance.now(),
    };

    const { cols, rows, targetCells, baseMask } = gridRef.current;
    if (cols === 0 || rows === 0) return;

    const centerCol = Math.floor(x / cellSize);
    const centerRow = Math.floor(y / cellSize);

    // 1. Scramble cells within interaction radius of mouse
    const radius = 3;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const c = centerCol + dc;
        const r = centerRow + dr;

        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          const idx = r * cols + c;
          // Strictly protect text area: never spawn pixels under text
          if ((baseMask[idx] ?? 0) === 1) continue;

          const dist = Math.sqrt(dc * dc + dr * dr);
          if (dist <= radius && Math.random() < 0.4) {
            // Keep density airy (approx 30% filled, 70% negative space)
            targetCells[idx] = Math.random() > 0.68 ? 1 : 0;
          }
        }
      }
    }

    // 2. Subtly jitter 2-3 distant cells across the canvas on mouse move
    const jitterCount = 2;
    for (let j = 0; j < jitterCount; j++) {
      const randCol = Math.floor(Math.random() * cols);
      const randRow = Math.floor(Math.random() * rows);
      const randIdx = randRow * cols + randCol;
      if ((baseMask[randIdx] ?? 0) === 0) {
        targetCells[randIdx] = Math.random() > 0.68 ? 1 : 0;
      }
    }
  };

  const handleMouseEnter = () => {
    // When mouse enters, gently shuffle a few pixels on the right
    const { cols, rows, targetCells, baseMask } = gridRef.current;
    for (let i = 0; i < cols * rows; i++) {
      if ((baseMask[i] ?? 0) === 0 && Math.random() < 0.1) {
        targetCells[i] = Math.random() > 0.68 ? 1 : 0;
      }
    }
  };

  const handleMouseLeave = () => {
    mousePosRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full overflow-hidden cursor-crosshair ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none" />
    </div>
  );
}
