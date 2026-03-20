"use client";
import { useState } from "react";

const MONITORS = [
  {
    id: 1,
    name: "api.myapp.com",
    url: "https://api.myapp.com/health",
    type: "HTTPS",
    status: "up",
    latency: 48,
    uptime: 99.99,
    interval: "1m",
    location: "9 regions",
    lastChecked: "12s ago",
  },
  {
    id: 2,
    name: "myapp.com",
    url: "https://myapp.com",
    type: "HTTPS",
    status: "up",
    latency: 61,
    uptime: 100,
    interval: "1m",
    location: "9 regions",
    lastChecked: "23s ago",
  },
  {
    id: 3,
    name: "dashboard.myapp.com",
    url: "https://dashboard.myapp.com",
    type: "HTTPS",
    status: "up",
    latency: 89,
    uptime: 99.97,
    interval: "1m",
    location: "9 regions",
    lastChecked: "8s ago",
  },
  {
    id: 4,
    name: "cdn.myapp.com",
    url: "https://cdn.myapp.com",
    type: "HTTPS",
    status: "degraded",
    latency: 312,
    uptime: 99.71,
    interval: "1m",
    location: "9 regions",
    lastChecked: "5s ago",
  },
  {
    id: 5,
    name: "auth.myapp.com",
    url: "https://auth.myapp.com",
    type: "HTTPS",
    status: "up",
    latency: 52,
    uptime: 99.99,
    interval: "1m",
    location: "9 regions",
    lastChecked: "18s ago",
  },
];

function Sparkline({ status }: { monitorId: number; status: string }) {
  const bars = Array.from({ length: 20 });
  return (
    <div className="flex items-end gap-0.5 h-6">
      {bars.map((_, i) => {
        const h = 22;
        const isDegraded = status === "degraded" && i >= 16;
        return (
          <div
            key={i}
            className={`w-1.25 rounded-sm transition-all ${
              isDegraded ? "bg-amber-400/80 hover:bg-amber-300" : "bg-emerald-500/60 hover:bg-emerald-400"
            }`}
            title={isDegraded?  "Down":"Up"}
            style={{ height:`${h}px` }}
          />
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "up") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        <span className="text-xs text-emerald-400 font-medium">Up</span>
      </div>
    );
  }
  if (status === "degraded") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-xs text-amber-400 font-medium">Degraded</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      <span className="text-xs text-red-400 font-medium">Down</span>
    </div>
  );
}

export default function MonitorList() {
  const [filter, setFilter] = useState<"all" | "up" | "degraded" | "down">("all");

  const filtered = MONITORS.filter((m) => filter === "all" || m.status === filter);

  return (
    <div className="bg-white/2 border border-white/[0.07] rounded-xl overflow-hidden animate-fade-up-d2">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5">
          {(["all", "up", "degraded", "down"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                filter === f
                  ? "bg-white/8 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f === "all" ? `All (${MONITORS.length})` : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search monitors…"
              className="bg-white/4 border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-cyan-400/40 focus:bg-white/6 transition-all w-40"
            />
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_80px] gap-4 px-5 py-2.5 border-b border-white/4">
        {["Monitor", "Status", "Latency", "Last 20 checks", "Uptime", "Checked", ""].map((h) => (
          <p key={h} className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">{h}</p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/4">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr_1fr_80px] gap-4 px-5 py-3.5 items-center hover:bg-white/2 transition-colors group cursor-pointer"
          >
            {/* Name */}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm text-white font-medium group-hover:text-cyan-400 transition-colors">
                  {m.name}
                </span>
                <span className="text-[10px] text-zinc-700 bg-white/4 px-1.5 py-0.5 rounded font-mono">
                  {m.type}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 font-mono truncate">{m.url}</p>
            </div>

            {/* Status */}
            <StatusBadge status={m.status} />

            {/* Latency */}
            <div>
              <p className={`text-sm font-mono font-medium ${m.latency > 200 ? "text-amber-400" : "text-white"}`}>
                {m.latency}ms
              </p>
            </div>

            {/* Sparkline */}
            <Sparkline monitorId={m.id} status={m.status} />

            {/* Uptime */}
            <div>
              <p className={`text-sm font-medium ${m.uptime < 99.9 ? "text-amber-400" : "text-white"}`}>
                {m.uptime}%
              </p>
            </div>

            {/* Last checked */}
            <p className="text-xs text-zinc-600">{m.lastChecked}</p>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-md hover:bg-white/6 text-zinc-600 hover:text-zinc-300 transition-all" title="View details">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
              </button>
              <button className="p-1.5 rounded-md hover:bg-white/6 text-zinc-600 hover:text-zinc-300 transition-all" title="Edit">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all" title="Delete">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state for filtered */}
      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-zinc-600 text-sm">No monitors match this filter.</p>
        </div>
      )}
    </div>
  );
}
