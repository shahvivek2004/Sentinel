"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

const UPTIME_DATA = [
  { name: "api.acme.com",       uptime: "99.99%", ms: "48ms",  ok: true  },
  { name: "dashboard.acme.com", uptime: "100%",   ms: "61ms",  ok: true  },
  { name: "cdn.acme.com",       uptime: "99.97%", ms: "89ms",  ok: true  },
  { name: "auth.acme.com",      uptime: "99.99%", ms: "52ms",  ok: true  },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function MiniSparkline({ degraded }: { degraded?: boolean }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="flex items-end gap-px h-4">
      {bars.map((_, i) => {
        const isDegraded = degraded && i === 14;
        return (
          <div
            key={i}
            className={`w-1 rounded-sm transition-all ${isDegraded ? "bg-amber-400" : "bg-emerald-500/60"}`}
            style={{ height: isDegraded ? "8px" : `${8 + Math.sin(i * 0.9) * 4 + parseFloat(seededRandom(i * 17).toFixed(2)) * 3}px` }}
          />
        );
      })}
    </div>
  );
}

function LivePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let t = 0;
    let id: number;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 5; i++) {
        const phase = ((t / 140) + i * 0.2) % 1;
        const r = phase * Math.min(cx, cy) * 1.1;
        const alpha = (1 - phase) * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      t++;
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative h-full flex flex-col">
      {/* Canvas pulse bg */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Grid bg */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-auto">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
            <path d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z" stroke="#22D3EE" strokeWidth="1.5" fill="none" />
            <path d="M14 7L20.5 10.75V18.25L14 22L7.5 18.25V10.75L14 7Z" fill="#22D3EE" fillOpacity="0.12" />
            <circle cx="14" cy="14" r="3" fill="#22D3EE" />
          </svg>
          <span className="font-semibold text-white text-lg tracking-tight">Sentinel</span>
        </Link>

        {/* Center content */}
        <div className="my-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
          </div>

          <h2 className="text-2xl font-bold text-white leading-tight mb-2">
            Your infrastructure,<br />watched 24/7.
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-xs">
            7+ global check locations. Sub-30s alerting. SSL monitoring. Know before your users do.
          </p>

          {/* Live monitor cards */}
          <div className="space-y-2">
            {UPTIME_DATA.map((m, i) => (
              <div
                key={m.name}
                className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-lg px-3 py-2.5 animate-fade-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.ok ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                <span className="font-mono text-xs text-zinc-400 flex-1 truncate">{m.name}</span>
                <MiniSparkline />
                <span className="font-mono text-[10px] text-zinc-600 w-10 text-right">{m.ms}</span>
                <span className="text-[10px] text-zinc-400 font-medium w-12 text-right">{m.uptime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-auto pt-8 border-t border-white/6 grid grid-cols-3 gap-4">
          {[
            { value: "50K+", label: "Monitors" },
            { value: "20+",  label: "Locations" },
            { value: "99.98%", label: "Avg uptime" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-bold text-lg leading-none">{s.value}</p>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080C10] flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-120 xl:w-130 shrink-0 border-r border-white/6 bg-[#080C10]">
        <div className="w-full">
          <LivePanel />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 py-5 border-b border-white/6">
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
              <path d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z" stroke="#22D3EE" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="3" fill="#22D3EE" />
            </svg>
            <span className="font-semibold text-white">Sentinel</span>
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-100">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-zinc-700">© {new Date().getFullYear()} Sentinel</p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
