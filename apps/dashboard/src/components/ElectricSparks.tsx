"use client";

import { useEffect, useRef } from "react";

interface ElectricSparksProps {
  className?: string;
  intensity?: "low" | "medium" | "high";
}

export function ElectricSparks({ className, intensity = "medium" }: ElectricSparksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", handleResize);

    const parent = canvas.parentElement || canvas;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    parent.addEventListener("mousemove", handleMouseMove as EventListener);
    parent.addEventListener("mouseleave", handleMouseLeave);

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      decay: number;
      size: number;
      color: string;
      length: number;
    }

    interface BoltPoint {
      x: number;
      y: number;
    }

    interface Bolt {
      points: BoltPoint[];
      branches: BoltPoint[][];
      alpha: number;
      decay: number;
      color: string;
      width: number;
    }

    interface Flash {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      decay: number;
      color: string;
    }

    const sparks: Spark[] = [];
    const bolts: Bolt[] = [];
    const flashes: Flash[] = [];

    // Electric color palette: pure hot white, electric cyan, sky blue, neon azure
    const boltColors = ["#FFFFFF", "#72E7FF", "#58D9FF", "#38BDF8", "#00F0FF"];

    // Normalized letter anchor generators for "F - U - S - E"
    // Coordinates are normalized (0 to 1) relative to text bounding box
    const getLetterPoint = (): { x: number; y: number } => {
      const letter = Math.floor(Math.random() * 4); // 0: F, 1: U, 2: S, 3: E
      let nx: number;
      let ny: number;

      if (letter === 0) {
        // 'F'
        const segment = Math.random();
        if (segment < 0.5) {
          // Vertical spine
          nx = 0.08 + (Math.random() - 0.5) * 0.02;
          ny = 0.05 + Math.random() * 0.9;
        } else if (segment < 0.8) {
          // Top bar
          nx = 0.08 + Math.random() * 0.15;
          ny = 0.06 + (Math.random() - 0.5) * 0.02;
        } else {
          // Mid bar
          nx = 0.08 + Math.random() * 0.12;
          ny = 0.48 + (Math.random() - 0.5) * 0.02;
        }
      } else if (letter === 1) {
        // 'U'
        const segment = Math.random();
        if (segment < 0.4) {
          // Left stem
          nx = 0.3 + (Math.random() - 0.5) * 0.02;
          ny = 0.06 + Math.random() * 0.75;
        } else if (segment < 0.8) {
          // Right stem
          nx = 0.45 + (Math.random() - 0.5) * 0.02;
          ny = 0.06 + Math.random() * 0.75;
        } else {
          // Bottom curve
          nx = 0.3 + Math.random() * 0.15;
          ny = 0.88 + (Math.random() - 0.5) * 0.04;
        }
      } else if (letter === 2) {
        // 'S'
        const segment = Math.random();
        if (segment < 0.35) {
          // Top loop
          nx = 0.56 + Math.random() * 0.15;
          ny = 0.08 + Math.random() * 0.35;
        } else if (segment < 0.7) {
          // Diagonal spine
          nx = 0.56 + Math.random() * 0.15;
          ny = 0.42 + Math.random() * 0.2;
        } else {
          // Bottom loop
          nx = 0.56 + Math.random() * 0.15;
          ny = 0.65 + Math.random() * 0.3;
        }
      } else {
        // 'E'
        const segment = Math.random();
        if (segment < 0.45) {
          // Vertical spine
          nx = 0.78 + (Math.random() - 0.5) * 0.02;
          ny = 0.05 + Math.random() * 0.9;
        } else if (segment < 0.65) {
          // Top bar
          nx = 0.78 + Math.random() * 0.15;
          ny = 0.06 + (Math.random() - 0.5) * 0.02;
        } else if (segment < 0.85) {
          // Mid bar
          nx = 0.78 + Math.random() * 0.12;
          ny = 0.48 + (Math.random() - 0.5) * 0.02;
        } else {
          // Bottom bar
          nx = 0.78 + Math.random() * 0.15;
          ny = 0.92 + (Math.random() - 0.5) * 0.02;
        }
      }

      return { x: nx, y: ny };
    };

    // Convert normalized point to canvas coordinate
    const toCanvasCoord = (norm: { x: number; y: number }) => {
      // The text "FUSE" spans ~92% width and ~88% height centered
      const boxW = Math.min(width * 0.94, 1400);
      const boxH = Math.min(height * 0.88, 360);
      const boxX = (width - boxW) / 2;
      const boxY = (height - boxH) / 2;

      return {
        x: boxX + norm.x * boxW,
        y: boxY + norm.y * boxH,
      };
    };

    // Recursive midpoint displacement for fractal lightning
    const generateJaggedPath = (
      start: BoltPoint,
      end: BoltPoint,
      roughness: number,
      iterations: number
    ): BoltPoint[] => {
      let points = [start, end];

      for (let i = 0; i < iterations; i++) {
        const next: BoltPoint[] = [];
        for (let j = 0; j < points.length - 1; j++) {
          const p1 = points[j]!;
          const p2 = points[j + 1]!;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Perpendicular offset
          const normalX = -dy / (dist || 1);
          const normalY = dx / (dist || 1);
          const offset = (Math.random() - 0.5) * dist * roughness;

          const displaced: BoltPoint = {
            x: midX + normalX * offset,
            y: midY + normalY * offset,
          };

          next.push(p1);
          next.push(displaced);
        }
        next.push(points[points.length - 1]!);
        points = next;
      }

      return points;
    };

    const createBolt = (forceMouse = false) => {
      const p1Norm = getLetterPoint();
      const p1 = toCanvasCoord(p1Norm);
      let p2: BoltPoint;

      if (forceMouse && mouseRef.current.active) {
        // Arc to mouse cursor!
        p2 = { x: mouseRef.current.x, y: mouseRef.current.y };
      } else {
        const arcMode = Math.random();
        if (arcMode < 0.6) {
          // Local crackle: short arc leaping off the letter edge
          const angle = Math.random() * Math.PI * 2;
          const len = 15 + Math.random() * 45;
          p2 = {
            x: p1.x + Math.cos(angle) * len,
            y: p1.y + Math.sin(angle) * len,
          };
        } else if (arcMode < 0.85) {
          // Inter-letter spark gap arc! (leaps to another letter point)
          const p2Norm = getLetterPoint();
          p2 = toCanvasCoord(p2Norm);
        } else {
          // Flash burst into surrounding air
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          const len = 30 + Math.random() * 60;
          p2 = {
            x: p1.x + Math.cos(angle) * len,
            y: p1.y + Math.sin(angle) * len,
          };
        }
      }

      const mainPoints = generateJaggedPath(p1, p2, 0.45, 3);

      // Generate 1-2 secondary micro branches
      const branches: BoltPoint[][] = [];
      if (mainPoints.length > 4 && Math.random() < 0.65) {
        const branchStartIdx = Math.floor(1 + Math.random() * (mainPoints.length - 3));
        const branchStart = mainPoints[branchStartIdx]!;
        const angle = Math.random() * Math.PI * 2;
        const branchLen = 12 + Math.random() * 25;
        const branchEnd: BoltPoint = {
          x: branchStart.x + Math.cos(angle) * branchLen,
          y: branchStart.y + Math.sin(angle) * branchLen,
        };
        branches.push(generateJaggedPath(branchStart, branchEnd, 0.5, 2));
      }

      const color = boltColors[Math.floor(Math.random() * boltColors.length)] ?? "#58D9FF";

      bolts.push({
        points: mainPoints,
        branches,
        alpha: 1,
        decay: 0.12 + Math.random() * 0.1, // Fast electric decay (lasts 4-7 frames)
        color,
        width: 1.2 + Math.random() * 1.8,
      });

      // Contact flash glow at endpoints
      flashes.push({
        x: p1.x,
        y: p1.y,
        radius: 8 + Math.random() * 14,
        alpha: 0.9,
        decay: 0.14,
        color,
      });

      if (Math.random() < 0.7) {
        flashes.push({
          x: p2.x,
          y: p2.y,
          radius: 6 + Math.random() * 10,
          alpha: 0.8,
          decay: 0.15,
          color,
        });
      }

      // Eject flying spark embers from strike points
      const numSparks = 2 + Math.floor(Math.random() * 5);
      for (let s = 0; s < numSparks; s++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        sparks.push({
          x: p1.x,
          y: p1.y,
          vx: Math.cos(sparkAngle) * speed,
          vy: Math.sin(sparkAngle) * speed - 0.8, // slight upward ejection
          alpha: 1,
          decay: 0.03 + Math.random() * 0.04,
          size: 1 + Math.random() * 1.8,
          color: boltColors[Math.floor(Math.random() * boltColors.length)] ?? "#72E7FF",
          length: 2 + Math.random() * 4,
        });
      }
    };

    const spawnRate = intensity === "high" ? 0.65 : intensity === "low" ? 0.25 : 0.45;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Random spontaneous electric crackles
      if (Math.random() < spawnRate) {
        createBolt(false);
        // Cluster crackle (lightning rarely strikes purely once)
        if (Math.random() < 0.45) {
          createBolt(false);
        }
      }

      // Interactive mouse attraction
      if (mouseRef.current.active && Math.random() < 0.25) {
        createBolt(true);
      }

      // 1. Draw Flashes (radial glows behind bolts)
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]!;
        f.alpha -= f.decay;
        if (f.alpha <= 0) {
          flashes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = f.alpha;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(0.3, f.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Draw Lightning Bolts & Branches
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i]!;
        bolt.alpha -= bolt.decay;
        if (bolt.alpha <= 0) {
          bolts.splice(i, 1);
          continue;
        }

        // Draw outer electric aura glow
        ctx.save();
        ctx.globalAlpha = bolt.alpha * 0.9;
        ctx.strokeStyle = bolt.color;
        ctx.lineWidth = bolt.width * 2.2;
        ctx.shadowColor = bolt.color;
        ctx.shadowBlur = 16;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const drawPath = (pts: BoltPoint[]) => {
          ctx.beginPath();
          for (let j = 0; j < pts.length; j++) {
            const pt = pts[j]!;
            if (j === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        };

        drawPath(bolt.points);
        for (const branch of bolt.branches) {
          drawPath(branch);
        }

        // Draw hot white central core
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = Math.max(0.8, bolt.width * 0.45);
        ctx.shadowBlur = 6;
        drawPath(bolt.points);
        for (const branch of bolt.branches) {
          drawPath(branch);
        }

        ctx.restore();
      }

      // 3. Draw Flying Spark Particles / Embers
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i]!;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.08; // subtle gravity
        sp.vx *= 0.98; // air resistance
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.strokeStyle = sp.color;
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = sp.size;
        ctx.lineCap = "round";

        // Draw directional spark streak
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - sp.vx * 1.5, sp.y - sp.vy * 1.5);
        ctx.stroke();

        // Hot particle tip
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      parent.removeEventListener("mousemove", handleMouseMove as EventListener);
      parent.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none w-full h-full z-20 ${className ?? ""}`}
    />
  );
}
