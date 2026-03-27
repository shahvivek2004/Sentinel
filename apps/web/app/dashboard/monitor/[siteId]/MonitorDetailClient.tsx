// app/monitor/[siteId]/MonitorDetailClient.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { HTTP_URL } from "../../../../proxy";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Status = "Up" | "Down" | "Warning";

type DailyBar = {
  date: string; // "2025-03-01"
  total_checks: number;
  up_checks: number;
};

type OverviewData = {
  site_id: string;
  url: string;
  current_status: Status | null;
  current_latency_ms: number | null;
  uptime_30d_pct: number | null;
  daily_bars: DailyBar[];
};

type TimeseriesPoint = {
  bucket: string;
  avg_rt: number;
  min_rt: number;
  max_rt: number;
  p90: number;
  p95: number;
  p99: number;
};

type TimeseriesData = {
  points: TimeseriesPoint[];
  stats: {
    avg: number;
    min: number;
    max: number;
    p90: number;
    p95: number;
    p99: number;
  };
};

type IncidentData = {
  uptime_pct: number;
  total_incidents: number;
  total_downtime_minutes: number;
  from: string;
  to: string;
};

type TimeRange = "24h" | "7d" | "30d";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE = `${HTTP_URL}/api/v1`;

const REGIONS = [
  { id: "04c66f73-92fe-4794-ae20-b81e271590b9", label: "Asia" },
  { id: "cf50e244-68e6-4090-a93f-673710f72ca9", label: "America" },
  { id: "bdb99f8e-583a-4c66-b536-cb67d582c189", label: "Australia" },
  { id: "bdfb260d-ddb7-43fb-9e32-4391024b4db4", label: "Europe" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
const fmtMs = (ms?: number | null) =>
  ms == null ? "—" : `${Math.round(ms)}ms`;
const fmtPct = (n?: number | null, d = 2) =>
  n == null ? "—" : `${n.toFixed(d)}%`;
const fmtDT = (m: number) => {
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60),
    rem = Math.round(m % 60);
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
};
const toDateVal = (d: Date) => d.toISOString().split("T")[0];

function barHex(ratio: number | null): string {
  if (ratio === null) return "#27272a";
  if (ratio === 1) return "#16a34a";
  if (ratio >= 0.99) return "#22c55e";
  if (ratio >= 0.95) return "#eab308";
  if (ratio >= 0.9) return "#f97316";
  return "#ef4444";
}

function bucketLabel(iso: string, range: TimeRange) {
  const d = new Date(iso);
  return range === "24h"
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-white/6 rounded animate-pulse ${className}`} />;
}

function StatusPill({ status }: { status: Status | null }) {
  if (!status) return <span className="text-zinc-600 text-xs">Unknown</span>;
  const map = {
    Up: {
      ring: "bg-emerald-500/10 border-emerald-500/30",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
    },
    Warning: {
      ring: "bg-amber-500/10  border-amber-500/30",
      dot: "bg-amber-400",
      text: "text-amber-400",
    },
    Down: {
      ring: "bg-red-500/10    border-red-500/30",
      dot: "bg-red-500",
      text: "text-red-400",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${map.ring} ${map.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${map.dot} ${status !== "Up" ? "animate-pulse" : ""}`}
      />
      {status}
    </span>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/3 border border-white/[0.07] rounded-xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/6">
      <p className="text-sm font-medium text-white">{title}</p>
      {right}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white/3 border border-white/[0.07] rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart tooltip
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  range,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  range: TimeRange;
}) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs shadow-xl">
      <p className="text-zinc-400 mb-2 font-medium">
        {label ? bucketLabel(label, range) : ""}
      </p>
      <div className="space-y-1">
        {[
          { k: "avg_rt", label: "Avg", color: "text-cyan-400" },
          { k: "min_rt", label: "Min", color: "text-emerald-400" },
          { k: "max_rt", label: "Max", color: "text-red-400" },
        ].map(({ k, label: l, color }) => {
          const v = get(k);
          if (v == null) return null;
          return (
            <div key={k} className="flex justify-between gap-6">
              <span className="text-zinc-500">{l}</span>
              <span className={`font-mono ${color}`}>{fmtMs(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Overview + 30-day bars
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSection({
  siteId,
  region,
}: {
  siteId: string;
  region: string;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${BASE}/sites/${siteId}/overview?region=${region}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((j) => setData(j.message.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [siteId, region]);

  // 30 slots, older slots on the left are null (gray) until data fills them
  const slots: (DailyBar | null)[] = Array(30).fill(null);
  if (data?.daily_bars) {
    const bars = data.daily_bars.slice(-30);
    bars.forEach((b, i) => {
      slots[30 - bars.length + i] = b;
    });
  }

  return (
    <section className="space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {loading ? (
            <>
              <Skeleton className="h-8 w-56 mb-2" />
              <Skeleton className="h-3.5 w-44" />
            </>
          ) : error ? (
            <p className="text-red-400 text-sm">
              Failed to load overview: {error}
            </p>
          ) : data ? ( // ← add null check
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-white tracking-tight">
                  {getHostname(data.url)} {/* drop the ! */}
                </h1>
                <StatusPill status={data.current_status} />
              </div>
              <p className="text-zinc-600 text-sm font-mono mt-1">{data.url}</p>
            </>
          ) : null}
        </div>
        {loading || !data ? (
          <Skeleton className="h-10 w-28" />
        ) : (
          <div className="text-right">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-0.5">
              Current latency
            </p>
            <p
              className={`text-xl font-mono font-semibold ${(data.current_latency_ms ?? 0) > 200 ? "text-amber-400" : "text-white"}`}
            >
              {fmtMs(data.current_latency_ms)}
            </p>
          </div>
        )}
      </div>

      {/* 30-day uptime stat + bars */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        {loading || !data ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <StatBox
            label="30-day uptime"
            value={fmtPct(data.uptime_30d_pct)}
            sub="Selected region"
            valueClass={
              (data?.uptime_30d_pct ?? 100) >= 99.9
                ? "text-emerald-600"
                : (data?.uptime_30d_pct ?? 100) >= 99
                  ? "text-emerald-400"
                  : (data?.uptime_30d_pct ?? 100) >= 95
                    ? "text-yellow-400"
                    : "text-red-400"
            }
          />
        )}

        <SectionCard className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-medium">
              Daily uptime — last 30 days
            </p>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-zinc-600">
              {[
                { hex: "#16a34a", label: "100%" },
                { hex: "#22c55e", label: "≥99%" },
                { hex: "#eab308", label: "≥95%" },
                { hex: "#f97316", label: "≥90%" },
                { hex: "#ef4444", label: "<90%" },
                { hex: "#27272a", label: "No data" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-sm inline-block"
                    style={{ backgroundColor: l.hex }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-end gap-0.75 h-10">
              {Array(30)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full bg-white/6 rounded-sm animate-pulse"
                    style={{ animationDelay: `${i * 25}ms` }}
                  />
                ))}
            </div>
          ) : (
            <div className="flex items-end gap-0.75 h-10">
              {slots.map((bar, i) => {
                const ratio =
                  bar && bar.total_checks > 0
                    ? bar.up_checks / bar.total_checks
                    : null;
                const pct = ratio !== null ? (ratio * 100).toFixed(1) : null;
                const label = bar?.date
                  ? new Date(bar.date).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })
                  : `Slot ${i + 1} (no data yet)`;
                return (
                  <div key={i} className="relative flex-1 h-full group">
                    <div
                      className="w-full h-full rounded-sm transition-opacity group-hover:opacity-70 cursor-default"
                      style={{ backgroundColor: barHex(ratio) }}
                    />
                    {/* Hover tooltip */}
                    <div
                      className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-20
                                    bg-zinc-900 border border-white/10 rounded-md px-2.5 py-2 text-[10px]
                                    whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100
                                    pointer-events-none transition-opacity"
                    >
                      <p className="text-zinc-200 font-medium">{label}</p>
                      <p className="text-zinc-500 mt-0.5">
                        {pct !== null ? `${pct}% uptime` : "No data yet"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between mt-2">
            <p className="text-[10px] text-zinc-700">30 days ago</p>
            <p className="text-[10px] text-zinc-700">Today</p>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Response time chart
// ─────────────────────────────────────────────────────────────────────────────

function TimeseriesSection({
  siteId,
  region,
}: {
  siteId: string;
  region: string;
}) {
  const [range, setRange] = useState<TimeRange>("24h");
  const [data, setData] = useState<TimeseriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(
      `${BASE}/sites/${siteId}/timeseries?range=${range}&region=${region}`,
      { credentials: "include" },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((j) => setData(j.message.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [siteId, region, range]);

  const stats = data
    ? [
        { label: "Avg", value: fmtMs(data.stats.avg), color: "text-cyan-400" },
        {
          label: "Min",
          value: fmtMs(data.stats.min),
          color: "text-emerald-400",
        },
        { label: "Max", value: fmtMs(data.stats.max), color: "text-red-400" },
        { label: "p90", value: fmtMs(data.stats.p90), color: "text-zinc-300" },
        { label: "p95", value: fmtMs(data.stats.p95), color: "text-zinc-300" },
        { label: "p99", value: fmtMs(data.stats.p99), color: "text-amber-400" },
      ]
    : [];

  const rangeTabs = (
    <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5">
      {(["24h", "7d", "30d"] as TimeRange[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            range === r
              ? "bg-white/8 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <SectionCard>
      <SectionHeader title="Response Time" right={rangeTabs} />

      {/* Stat strip */}
      {!loading && !error && data && (
        <div className="flex flex-wrap border-b border-white/6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex-1 min-w-18 px-4 py-3 bg-white/1.5 text-center border-r border-white/4 last:border-r-0"
            >
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">
                {s.label}
              </p>
              <p
                className={`text-sm font-mono font-semibold tabular-nums ${s.color}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart body */}
      <div className="px-2 pt-5 pb-3">
        {loading ? (
          <div className="h-52.5 flex items-end gap-1 px-4">
            {Array(32)
              .fill(null)
              .map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/5 rounded-t animate-pulse"
                  style={{
                    height: `${25 + Math.sin(i * 0.6) * 30 + 30}%`,
                    animationDelay: `${i * 35}ms`,
                  }}
                />
              ))}
          </div>
        ) : error ? (
          <div className="h-52.5 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">
              Failed to load chart: {error}
            </p>
          </div>
        ) : !data?.points.length ? (
          <div className="h-52.5 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">
              No data available for this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart
              data={data.points}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => bucketLabel(v, range)}
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `${v}ms`}
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<ChartTooltip range={range} />} />
              <Area
                type="monotone"
                dataKey="max_rt"
                stroke="#f87171"
                strokeWidth={1}
                strokeOpacity={0.3}
                fill="url(#gMax)"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="min_rt"
                stroke="#34d399"
                strokeWidth={1}
                strokeOpacity={0.3}
                fill="transparent"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="avg_rt"
                stroke="#22d3ee"
                strokeWidth={1.5}
                fill="url(#gAvg)"
                dot={false}
                activeDot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {!loading && !error && data && (
        <div className="flex items-center gap-5 px-5 pb-4">
          {[
            ["#22d3ee", "Avg"],
            ["#34d399", "Min"],
            ["#f87171", "Max"],
          ].map(([c, l]) => (
            <span
              key={l}
              className="flex items-center gap-1.5 text-[10px] text-zinc-500"
            >
              <span
                className="w-5 h-px inline-block"
                style={{ backgroundColor: c }}
              />
              {l}
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — SLA / incident calculator
// ─────────────────────────────────────────────────────────────────────────────

function IncidentsSection({
  siteId,
  region,
}: {
  siteId: string;
  region: string;
}) {
  const today = new Date();
  const ago30 = new Date(today);
  ago30.setDate(ago30.getDate() - 30);

  const [from, setFrom] = useState(toDateVal(ago30));
  const [to, setTo] = useState(toDateVal(today));
  const [data, setData] = useState<IncidentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReady(true);
    try {
      const r = await fetch(
        `${BASE}/sites/${siteId}/incidents?from=${from}&to=${to}&region=${region}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`${r.status}`);
      setData((await r.json()).message.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [siteId, region, from, to]);

  const uptimeCls = !data
    ? "text-white"
    : data.uptime_pct >= 99.9
      ? "text-emerald-600"
      : data.uptime_pct >= 99
        ? "text-emerald-400"
        : data.uptime_pct >= 95
          ? "text-yellow-400"
          : "text-red-400";

  return (
    <SectionCard>
      <SectionHeader
        title="Overall SLA & Incident Report"
        right={
          <p className="text-xs text-zinc-600">
            Calculate uptime for a custom date range
          </p>
        }
      />

      <div className="px-5 py-5 space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          {[
            {
              lbl: "From",
              val: from,
              setter: setFrom,
              max: to,
              min: undefined,
            },
            {
              lbl: "To",
              val: to,
              setter: setTo,
              max: toDateVal(today),
              min: from,
            },
          ].map(({ lbl, val, setter, max, min }) => (
            <div key={lbl} className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest">
                {lbl}
              </label>
              <input
                type="date"
                value={val}
                min={min}
                max={max}
                onChange={(e) => setter(e.target.value)}
                className="bg-white/4 border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-white
                           outline-none focus:border-cyan-400/40 transition-all scheme-dark"
              />
            </div>
          ))}

          <button
            onClick={calculate}
            disabled={loading}
            className="px-4 py-1.75 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400
                       text-sm font-medium hover:bg-cyan-500/20 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg
                className="w-3.5 h-3.5 animate-spin"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" strokeLinecap="round" />
              </svg>
            )}
            Calculate
          </button>
        </div>

        {/* Error */}
        {error && ready && (
          <p className="text-red-400 text-sm">Error: {error}</p>
        )}

        {/* Results */}
        {!loading && ready && data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              label="Uptime"
              value={fmtPct(data.uptime_pct, 3)}
              sub={`${data.from} → ${data.to}`}
              valueClass={uptimeCls}
            />
            <StatBox
              label="Incidents"
              value={String(data.total_incidents)}
              sub={
                data.total_incidents === 0
                  ? "No incidents detected"
                  : "Detected outages"
              }
              valueClass={
                data.total_incidents > 0 ? "text-red-400" : "text-emerald-400"
              }
            />
            <StatBox
              label="Total downtime"
              value={
                data.total_downtime_minutes > 0
                  ? fmtDT(data.total_downtime_minutes)
                  : "0m"
              }
              sub={
                data.total_downtime_minutes > 0
                  ? "Cumulative down duration"
                  : "No downtime recorded"
              }
              valueClass={
                data.total_downtime_minutes > 0
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            />
          </div>
        )}

        {/* Pre-calculate hint */}
        {!ready && (
          <p className="flex items-center gap-2 text-zinc-700 text-sm">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-4 h-4 shrink-0"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 2" strokeLinecap="round" />
            </svg>
            Select a date range and click Calculate to generate the report.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Region selector
// ─────────────────────────────────────────────────────────────────────────────

function RegionSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (r: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest hidden sm:block">
        Region
      </p>
      <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              value === r.id
                ? "bg-white/8 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root client component
// ─────────────────────────────────────────────────────────────────────────────

export default function MonitorDetailClient({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [region, setRegion] = useState("04c66f73-92fe-4794-ae20-b81e271590b9");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-white/6 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm group"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M10 12L6 8l4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">Back to monitors</span>
            <span className="sm:hidden">Back</span>
          </button>

          <RegionSelector value={region} onChange={setRegion} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OverviewSection siteId={siteId} region={region} />
        <div className="border-t border-white/5" />
        <TimeseriesSection siteId={siteId} region={region} />
        <IncidentsSection siteId={siteId} region={region} />
        <div className="h-8" />
      </div>
    </div>
  );
}
