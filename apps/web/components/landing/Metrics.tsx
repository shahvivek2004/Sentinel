"use client";
import { useEffect, useRef } from "react";

const POINTS: number[] = [
  52, 48, 61, 45, 55, 49, 58, 47, 63, 52, 48, 71, 55, 49, 58, 44, 62, 50, 48,
  66, 53, 49, 57, 45, 61, 50, 55, 49,
];

export default function Metrics() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const pad = { top: 12, right: 8, bottom: 22, left: 34 };
      const cw = w - pad.left - pad.right;
      const ch = h - pad.top - pad.bottom;
      const min = Math.min(...POINTS) - 8;
      const max = Math.max(...POINTS) + 8;
      const tx = (i: number) => pad.left + (i / (POINTS.length - 1)) * cw;
      const ty = (v: number) => pad.top + ch - ((v - min) / (max - min)) * ch;

      // Grid lines
      context.strokeStyle = "rgba(255,255,255,0.04)";
      context.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const y = pad.top + (ch / 3) * i;
        context.beginPath();
        context.moveTo(pad.left, y);
        context.lineTo(pad.left + cw, y);
        context.stroke();
      }
      // Y labels
      context.fillStyle = "rgba(255,255,255,0.18)";
      context.font = "9px monospace";
      context.textAlign = "right";
      for (let i = 0; i <= 3; i++) {
        const v = max - ((max - min) / 3) * i;
        context.fillText(
          Math.round(v) + "ms",
          pad.left - 4,
          pad.top + (ch / 3) * i + 3,
        );
      }

      // Fill
      const grad = context.createLinearGradient(0, pad.top, 0, pad.top + ch);
      grad.addColorStop(0, "rgba(34,211,238,0.18)");
      grad.addColorStop(1, "rgba(34,211,238,0)");
      context.beginPath();
      context.moveTo(tx(0), ty(POINTS[0]!));
      for (let i = 1; i < POINTS.length; i++) {
        const cpx = (tx(i - 1) + tx(i)) / 2;
        context.bezierCurveTo(
          cpx,
          ty(POINTS[i - 1]!),
          cpx,
          ty(POINTS[i]!),
          tx(i),
          ty(POINTS[i]!),
        );
      }
      context.lineTo(tx(POINTS.length - 1), pad.top + ch);
      context.lineTo(tx(0), pad.top + ch);
      context.closePath();
      context.fillStyle = grad;
      context.fill();

      // Line
      context.beginPath();
      context.moveTo(tx(0), ty(POINTS[0]!));
      for (let i = 1; i < POINTS.length; i++) {
        const cpx = (tx(i - 1) + tx(i)) / 2;
        context.bezierCurveTo(
          cpx,
          ty(POINTS[i - 1]!),
          cpx,
          ty(POINTS[i]!),
          tx(i),
          ty(POINTS[i]!),
        );
      }
      context.strokeStyle = "#22D3EE";
      context.lineWidth = 1.5;
      context.stroke();

      // Last point dot
      context.beginPath();
      context.arc(
        tx(POINTS.length - 1),
        ty(POINTS[POINTS.length - 1]!),
        3.5,
        0,
        Math.PI * 2,
      );
      context.fillStyle = "#22D3EE";
      context.fill();
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, []);

  return (
    <section className="py-24 border-t border-b border-white/6 bg-white/1.5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3 font-medium">
              Response time tracking
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-5">
              Latency trends,
              <br />
              not just averages.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8 text-[15px]">
              See p50, p95, and p99 response times over any time window. Catch
              latency regressions before they become outages. Every data point
              broken down by region.
            </p>
            <ul className="space-y-3">
              {[
                "1-minute check intervals on all plans",
                "90-day history retention",
                "p50 / p95 / p99 percentile breakdown",
                "Per-region latency comparison",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-zinc-400"
                >
                  <svg
                    className="w-4 h-4 text-cyan-400 shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M3 8l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/3 border border-white/[0.07] rounded-xl p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-mono text-xs text-zinc-500 mb-0.5">
                  api.myapp.com
                </p>
                <p className="text-white font-semibold text-sm">
                  Response Time — Last 24h
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white leading-none">
                  49ms
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  ↓ 6% vs yesterday
                </p>
              </div>
            </div>
            <canvas ref={canvasRef} className="w-full h-40 mt-4 block" />
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/6">
              {[
                { label: "p50", value: "48ms" },
                { label: "p95", value: "72ms" },
                { label: "p99", value: "91ms" },
              ].map((p) => (
                <div key={p.label} className="text-center">
                  <p className="text-zinc-500 text-xs">{p.label}</p>
                  <p className="text-white font-semibold mt-0.5">{p.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
