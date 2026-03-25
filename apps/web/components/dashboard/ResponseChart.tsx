"use client";
import { useEffect, useRef, useState } from "react";

const RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;
type Range = (typeof RANGES)[number];

// Deterministic data sets per range
function generatePoints(range: Range): number[] {
  const counts: Record<Range, number> = {
    "1h": 30,
    "6h": 36,
    "24h": 48,
    "7d": 49,
    "30d": 60,
  };
  const n = counts[range];
  return Array.from({ length: n }, (_, i) => {
    const x =
      Math.sin(i * 0.4 + RANGES.indexOf(range) * 2) * 20 +
      60 +
      Math.sin(i * 1.3) * 10;
    return Math.max(20, Math.min(140, x));
  });
}

export default function ResponseChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [range, setRange] = useState<Range>("24h");
  const points = generatePoints(range);
  const avg = Math.round(points.reduce((a, b) => a + b, 0) / points.length);
  const peak = Math.round(Math.max(...points));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const pad = { top: 12, right: 12, bottom: 24, left: 36 };
      const cw = w - pad.left - pad.right;
      const ch = h - pad.top - pad.bottom;
      const min = Math.min(...points) - 10;
      const max = Math.max(...points) + 10;
      const tx = (i: number) => pad.left + (i / (points.length - 1)) * cw;
      const ty = (v: number) => pad.top + ch - ((v - min) / (max - min)) * ch;

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (ch / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + cw, y);
        ctx.stroke();
        const v = max - ((max - min) / 4) * i;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.font = "9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(Math.round(v) + "ms", pad.left - 4, y + 3);
      }

      // Fill gradient
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
      grad.addColorStop(0, "rgba(34,211,238,0.15)");
      grad.addColorStop(1, "rgba(34,211,238,0)");
      ctx.beginPath();
      ctx.moveTo(tx(0), ty(points[0]!));
      for (let i = 1; i < points.length; i++) {
        const cpx = (tx(i - 1) + tx(i)) / 2;
        ctx.bezierCurveTo(
          cpx,
          ty(points[i - 1]!),
          cpx,
          ty(points[i]!),
          tx(i),
          ty(points[i]!),
        );
      }
      ctx.lineTo(tx(points.length - 1), pad.top + ch);
      ctx.lineTo(tx(0), pad.top + ch);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(tx(0), ty(points[0]!));
      for (let i = 1; i < points.length; i++) {
        const cpx = (tx(i - 1) + tx(i)) / 2;
        ctx.bezierCurveTo(
          cpx,
          ty(points[i - 1]!),
          cpx,
          ty(points[i]!),
          tx(i),
          ty(points[i]!),
        );
      }
      ctx.strokeStyle = "#22D3EE";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Last dot
      const lx = tx(points.length - 1);
      const ly = ty(points[points.length - 1]!);
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#22D3EE";
      ctx.fill();
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [range, points]);

  return (
    <div className="bg-white/2 border border-white/[0.07] rounded-xl p-5 animate-fade-up-d3">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Response time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{avg}ms</span>
            <span className="text-xs text-emerald-400">↓ 4ms vs yesterday</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                range === r
                  ? "bg-white/8 text-white"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-36 block" />

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/6">
        {[
          { label: "p50", value: `${Math.round(avg * 0.9)}ms` },
          { label: "p95", value: `${Math.round(avg * 1.35)}ms` },
          { label: "Peak", value: `${peak}ms` },
        ].map((p) => (
          <div key={p.label} className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              {p.label}
            </p>
            <p className="text-sm font-semibold text-white mt-0.5">{p.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
