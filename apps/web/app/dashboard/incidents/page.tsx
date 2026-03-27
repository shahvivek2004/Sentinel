"use client";

import { useEffect, useState, useMemo } from "react";
import { HTTP_URL } from "../../../proxy";

// ── Types ─────────────────────────────────────────────────────

type Incident = {
  id: string;
  siteId: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  region_id?: number;
  site: {
    id: string;
    url: string;
  };
};

type GroupedIncident = {
  id: string;
  siteId: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  regions: number[];
  site: { id: string; url: string };
};

type FilterType = "all" | "ongoing" | "resolved";
type SortKey = "startedAt" | "duration" | "site";

// ── Region Config ─────────────────────────────────────────────

const REGION_MAP: Record<number, { label: string; color: string }> = {
  1: {
    label: "AS",
    color: "text-violet-400 border-violet-400/30 bg-violet-400/8",
  },
  2: { label: "US", color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/8" },
  3: {
    label: "EU",
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
  },
  4: {
    label: "AU",
    color: "text-amber-400 border-amber-400/30 bg-amber-400/8",
  },
};

const REGION_ORDER = [1, 2, 3, 4];

// ── Helpers ───────────────────────────────────────────────────

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDuration(sec?: number | null) {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeRelative(date: string) {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTimeAbsolute(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function groupIncidents(incidents: Incident[]): GroupedIncident[] {
  const groups: Record<string, Incident & { regions: Set<number> }> = {};
  for (const inc of incidents) {
    const timeBucket = Math.floor(new Date(inc.startedAt).getTime() / 10000);
    const key = `${inc.siteId}-${timeBucket}`;
    if (!groups[key]) {
      groups[key] = { ...inc, regions: new Set<number>() };
    }
    if (inc.region_id) groups[key].regions.add(inc.region_id);
  }
  return Object.values(groups).map((g) => ({
    ...g,
    regions: REGION_ORDER.filter((r) => g.regions.has(r)),
  }));
}

// ── Severity helper based on duration ────────────────────────

function getSeverity(
  inc: GroupedIncident,
): "critical" | "major" | "minor" | "ongoing" {
  if (!inc.resolvedAt) return "ongoing";
  const sec = inc.durationSeconds ?? 0;
  if (sec > 3600) return "critical";
  if (sec > 600) return "major";
  return "minor";
}

const SEVERITY_CFG = {
  ongoing: {
    label: "Ongoing",
    dot: "bg-red-500 animate-pulse",
    text: "text-red-400",
    badge: "bg-red-500/10 border-red-500/20 text-red-400",
    bar: "bg-red-500",
  },
  critical: {
    label: "Critical",
    dot: "bg-orange-500",
    text: "text-orange-400",
    badge: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    bar: "bg-orange-500",
  },
  major: {
    label: "Major",
    dot: "bg-amber-400",
    text: "text-amber-400",
    badge: "bg-amber-400/10 border-amber-400/20 text-amber-400",
    bar: "bg-amber-400",
  },
  minor: {
    label: "Resolved",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    badge: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
    bar: "bg-emerald-400",
  },
};

// ── Stat Card ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white/2.5 border border-white/6 rounded-xl px-5 py-2 flex flex-col gap-1">
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold font-mono ${accent ?? "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

// ── Timeline bar ──────────────────────────────────────────────

function TimelineBar({ incidents }: { incidents: GroupedIncident[] }) {
  const SLOTS = 96;
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const slotMs = windowMs / SLOTS;

  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const slotStart = now - windowMs + i * slotMs;
    const slotEnd = slotStart + slotMs;

    let hasOngoing = false;
    let hasCritical = false;
    let hasMajor = false;
    let hasMinor = false;

    for (const inc of incidents) {
      const start = new Date(inc.startedAt).getTime();
      const end = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : now;
      if (start < slotEnd && end > slotStart) {
        const sev = getSeverity(inc);
        if (sev === "ongoing") hasOngoing = true;
        else if (sev === "critical") hasCritical = true;
        else if (sev === "major") hasMajor = true;
        else hasMinor = true;
      }
    }

    let color = "bg-emerald-500/20";
    if (hasOngoing) color = "bg-red-500";
    else if (hasCritical) color = "bg-orange-500";
    else if (hasMajor) color = "bg-amber-400";
    else if (hasMinor) color = "bg-emerald-400/60";

    return color;
  });

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          24h Timeline
        </p>
        <p className="text-[10px] text-zinc-700">← 24 hours ago · now →</p>
      </div>
      <div className="flex gap-px h-6 rounded overflow-hidden">
        {slots.map((color, i) => (
          <div
            key={i}
            className={`flex-1 rounded-[1px] ${color} transition-colors`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[4px_2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-white/4 animate-pulse items-center">
      <div className="w-1 h-8 rounded-full bg-white/8" />
      <div className="space-y-2">
        <div className="h-3.5 w-36 bg-white/8 rounded" />
        <div className="h-2.5 w-52 bg-white/5 rounded" />
      </div>
      <div className="h-3 w-16 bg-white/8 rounded" />
      <div className="h-3 w-12 bg-white/8 rounded" />
      <div className="h-3 w-20 bg-white/8 rounded" />
      <div className="h-3 w-14 bg-white/8 rounded" />
    </div>
  );
}

// ── Expanded Detail Panel ─────────────────────────────────────

function IncidentDetail({ incident }: { incident: GroupedIncident }) {
  const sev = getSeverity(incident);
  const cfg = SEVERITY_CFG[sev];

  return (
    <div className="bg-[#060A0E] border-t border-white/5 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
          Started
        </p>
        <p className="text-xs font-mono text-zinc-300">
          {formatTimeAbsolute(incident.startedAt)}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
          Resolved
        </p>
        <p className="text-xs font-mono text-zinc-300">
          {incident.resolvedAt ? formatTimeAbsolute(incident.resolvedAt) : "—"}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
          Duration
        </p>
        <p className={`text-xs font-mono font-semibold ${cfg.text}`}>
          {formatDuration(incident.durationSeconds)}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
          Affected Regions
        </p>
        <div className="flex gap-1 flex-wrap mt-0.5">
          {incident.regions.length > 0 ? (
            incident.regions.map((r) => {
              const reg = REGION_MAP[r];
              if (!reg) return null;
              return (
                <span
                  key={r}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${reg.color}`}
                >
                  {reg.label}
                </span>
              );
            })
          ) : (
            <span className="text-zinc-600 text-xs">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("startedAt");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await fetch(`${HTTP_URL}/api/v1/sites/incidents`, {
          credentials: "include",
        });
        const json = await res.json();
        setIncidents(json.message.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIncidents();
  }, []);

  const grouped = useMemo(() => groupIncidents(incidents), [incidents]);

  const stats = useMemo(() => {
    const ongoing = grouped.filter((i) => !i.resolvedAt).length;
    const resolved = grouped.filter((i) => i.resolvedAt).length;
    const totalDuration = grouped.reduce(
      (a, i) => a + (i.durationSeconds ?? 0),
      0,
    );
    const avgDuration = resolved > 0 ? Math.round(totalDuration / resolved) : 0;
    const critical = grouped.filter(
      (i) => getSeverity(i) === "critical",
    ).length;
    return { ongoing, resolved, avgDuration, critical, total: grouped.length };
  }, [grouped]);

  const filtered = useMemo(() => {
    let list = grouped.filter((inc) => {
      if (filter === "ongoing" && inc.resolvedAt) return false;
      if (filter === "resolved" && !inc.resolvedAt) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          getHostname(inc.site.url).includes(q) ||
          inc.site.url.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "startedAt")
        return (
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
      if (sortKey === "duration")
        return (
          (b.durationSeconds ?? Infinity) - (a.durationSeconds ?? Infinity)
        );
      if (sortKey === "site")
        return getHostname(a.site.url).localeCompare(getHostname(b.site.url));
      return 0;
    });

    return list;
  }, [grouped, filter, search, sortKey]);

  return (
    <div className="space-y-4 animate-fade-up-d2 p-8">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Incidents"
          value={loading ? "—" : stats.total}
          sub="Last 20 fetched"
        />
        <StatCard
          label="Ongoing"
          value={loading ? "—" : stats.ongoing}
          sub={stats.ongoing > 0 ? "Requires attention" : "All clear"}
          accent={stats.ongoing > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <StatCard
          label="Critical (>1h)"
          value={loading ? "—" : stats.critical}
          sub="Over 1 hour duration"
          accent={stats.critical > 0 ? "text-orange-400" : "text-white"}
        />
        <StatCard
          label="Avg. MTTR"
          value={loading ? "—" : formatDuration(stats.avgDuration)}
          sub="Mean time to resolve"
          accent="text-cyan-400"
        />
      </div>

      {/* Main Panel */}
      <div className="bg-white/2 border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/6 flex items-center justify-between px-6 bg-[#080C10] sticky top-0 z-10">
          <div>
            <h2 className="text-sm text-zinc-300 font-medium">Incidents</h2>
            <p className="text-xs text-zinc-600">
              {loading
                ? "Loading…"
                : stats.ongoing > 0
                  ? `${stats.ongoing} active incident${stats.ongoing > 1 ? "s" : ""}`
                  : "No active incidents"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3 3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sites…"
                className="bg-white/4 border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-cyan-400/40 focus:bg-white/6 transition-all w-36"
              />
            </div>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-white/4 border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 outline-none focus:border-cyan-400/40 transition-all cursor-pointer"
            >
              <option value="startedAt">Latest first</option>
              <option value="duration">Longest first</option>
              <option value="site">Site A–Z</option>
            </select>
          </div>
        </header>

        {/* Filter pills + legend */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-white/5 bg-[#080C10]/60">
          {(["all", "ongoing", "resolved"] as const).map((f) => {
            const counts = {
              all: stats.total,
              ongoing: stats.ongoing,
              resolved: stats.resolved,
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-white/8 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {!loading && (
                  <span className="ml-1.5 text-[10px] text-zinc-600">
                    ({counts[f]})
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-3">
            {(["ongoing", "critical", "major", "minor"] as const).map((sev) => {
              const cfg = SEVERITY_CFG[sev];
              return (
                <div key={sev} className="hidden md:flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <span className="text-[10px] text-zinc-600">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 24h Timeline */}
        {!loading && grouped.length > 0 && (
          <div className="border-b border-white/5 pt-4">
            <TimelineBar incidents={grouped} />
          </div>
        )}

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[4px_2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-2.5 border-b border-white/4">
          {["", "Incident", "Severity", "Regions", "Started", "Duration"].map(
            (h, i) => (
              <p
                key={i}
                className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium"
              >
                {h}
              </p>
            ),
          )}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="divide-y divide-white/4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-3">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-4 h-4 text-zinc-600"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M8 3v5l3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="8" r="6" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">
              {search
                ? `No incidents match "${search}"`
                : "No incidents recorded"}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {filtered.map((incident) => {
              const sev = getSeverity(incident);
              const cfg = SEVERITY_CFG[sev];
              const isExpanded = expandedId === incident.id;

              return (
                <div key={incident.id}>
                  <div
                    className="grid grid-cols-[4px_2fr_auto] md:grid-cols-[4px_2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 hover:bg-white/1.5 transition-colors group cursor-pointer items-center"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : incident.id)
                    }
                  >
                    {/* Severity bar */}
                    <div
                      className={`w-0.75 h-8 rounded-full ${cfg.bar} self-center opacity-80`}
                    />

                    {/* Site info */}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm text-white font-medium group-hover:text-cyan-400 transition-colors">
                          {getHostname(incident.site.url)}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                        {/* Mobile region tags */}
                        <div className="flex gap-1 md:hidden">
                          {incident.regions.map((r) => {
                            const reg = REGION_MAP[r];
                            if (!reg) return null;
                            return (
                              <span
                                key={r}
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${reg.color}`}
                              >
                                {reg.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-mono truncate max-w-60">
                        {incident.site.url}
                      </p>
                    </div>

                    {/* Severity (desktop) */}
                    <div className="hidden md:flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Regions (desktop) */}
                    <div className="hidden md:flex items-center gap-1 flex-wrap">
                      {incident.regions.length > 0 ? (
                        incident.regions.map((r) => {
                          const reg = REGION_MAP[r];
                          if (!reg) return null;
                          return (
                            <span
                              key={r}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${reg.color}`}
                            >
                              {reg.label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-zinc-700 text-xs font-mono">
                          —
                        </span>
                      )}
                    </div>

                    {/* Started (desktop) */}
                    <div className="hidden md:block">
                      <p className="text-xs text-zinc-400 font-mono">
                        {formatTimeRelative(incident.startedAt)}
                      </p>
                      <p className="text-[10px] text-zinc-700 mt-0.5">
                        {formatTimeAbsolute(incident.startedAt)}
                      </p>
                    </div>

                    {/* Duration (desktop) */}
                    <div className="hidden md:flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-mono font-semibold ${
                            incident.resolvedAt ? cfg.text : "text-red-400"
                          }`}
                        >
                          {incident.resolvedAt
                            ? formatDuration(incident.durationSeconds)
                            : "Ongoing"}
                        </p>
                        <p className="text-[10px] text-zinc-700">
                          {incident.resolvedAt
                            ? "Total duration"
                            : "In progress"}
                        </p>
                      </div>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className={`w-3.5 h-3.5 text-zinc-700 transition-transform ml-2 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* Mobile: duration */}
                    <div className="md:hidden text-right">
                      <p
                        className={`text-sm font-mono font-semibold ${
                          incident.resolvedAt ? cfg.text : "text-red-400"
                        }`}
                      >
                        {incident.resolvedAt
                          ? formatDuration(incident.durationSeconds)
                          : "Live"}
                      </p>
                      <p className="text-[10px] text-zinc-700">
                        {formatTimeRelative(incident.startedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && <IncidentDetail incident={incident} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/6 bg-white/1.5">
            <p className="text-[11px] text-zinc-600">
              Showing {filtered.length} of {grouped.length} incidents
            </p>
            <div className="flex items-center gap-3">
              {stats.ongoing > 0 && (
                <span className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
                  {stats.ongoing} active
                </span>
              )}
              <p className="text-[10px] text-zinc-700">Click a row to expand</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
