"use client";
import { useEffect, useRef } from "react";

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const MONITORS = [
  { name: "api.myapp.com", status: "up", latency: "48ms", uptime: "99.99%" },
  { name: "myapp.com", status: "up", latency: "61ms", uptime: "100%" },
  {
    name: "dashboard.myapp.com",
    status: "up",
    latency: "89ms",
    uptime: "99.97%",
  },
  {
    name: "cdn.myapp.com",
    status: "degraded",
    latency: "312ms",
    uptime: "99.71%",
  },
];

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    let id: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const cx = canvas.offsetWidth / 2;
      const cy = canvas.offsetHeight / 2;
      const maxR = Math.min(cx, cy) * 0.88;
      for (let i = 0; i < 4; i++) {
        const phase = (t / 110 + i * 0.25) % 1;
        const r = phase * maxR;
        const alpha = (1 - phase) * 0.14;
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
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      {/* Pulse canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-sm text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          Now monitoring 50,000+ endpoints globally
        </div>

        <h1 className="animate-fade-up-d1 text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
          Know before
          <br />
          your users do.
        </h1>

        <p className="animate-fade-up-d2 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sentinel watches your infrastructure 24/7 from 4+ global locations.
          Get alerted in seconds — not minutes — when something goes wrong.
        </p>

        <div className="animate-fade-up-d3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <a
            href="/signin"
            className="w-full sm:w-auto bg-cyan-400 text-black font-semibold px-8 py-3.5 rounded-md text-base hover:bg-cyan-300 transition-all duration-200 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          >
            Start monitoring free
          </a>
          <a
            href="/signup"
            className="w-full sm:w-auto border border-white/10 text-zinc-300 font-medium px-8 py-3.5 rounded-md text-base hover:bg-white/5 transition-all duration-200"
          >
            View live demo →
          </a>
        </div>
        <p className="animate-fade-up-d4 text-sm text-zinc-600">
          Free forever for 5 monitors · No credit card required
        </p>

        {/* Dashboard mockup */}
        <div className="animate-fade-up-d4 mt-16 relative">
          <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-[#080C10] to-transparent z-10 pointer-events-none" />
          <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
            {/* Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="ml-4 flex-1 bg-white/5 rounded text-xs text-zinc-600 px-3 py-1 text-center max-w-xs mx-auto">
                app.sentinel.sh/monitors
              </div>
            </div>
            {/* Body */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Overall Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 font-medium text-sm">
                      All systems operational
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">Avg Uptime (30d)</p>
                  <p className="text-white font-bold text-xl">99.98%</p>
                </div>
              </div>

              {MONITORS.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-4 py-3 border-b border-white/4 last:border-0"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${m.status === "up" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
                  />
                  <span className="font-mono text-sm text-zinc-300 flex-1 text-left">
                    {m.name}
                  </span>
                  <div className="hidden md:flex gap-0.5 items-end h-5">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-sm ${m.status === "degraded" && i === 19 ? "bg-amber-400 h-3" : "bg-emerald-500/70"}`}
                        style={{
                          height:
                            m.status === "degraded" && i === 19
                              ? undefined
                              : `${10 + parseFloat(seededRandom(m.name.length * 7 + i * 13).toFixed(2)) * 8}px`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-zinc-500 w-14 text-right">
                    {m.latency}
                  </span>
                  <span className="text-xs text-zinc-300 font-medium w-14 text-right">
                    {m.uptime}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#080C10] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
