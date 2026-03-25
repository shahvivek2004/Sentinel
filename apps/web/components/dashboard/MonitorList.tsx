"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HTTP_URL } from "../../proxy";
import AddMonitorModal from "./AddMonitorModal";

// ── Types ────────────────────────────────────────────────────────────────────

type SiteData = {
  id: string;
  primeRegionId: string;
  url: string;
  timeAdded: Date;
  intervalTime: number;
  method: string;
  timeout: number;
};

type RedisCache = {
  site_id: string;
  region_id: string;
  status: "Up" | "Down" | "Warning";
  response_time_ms: number;
  created_at: Date;
  status_code?: number;
  error_type?: string;
  error_reason?: string;
};

type DashboardResponse = {
  message: {
    data: {
      site_data: {
        sites: SiteData[];
      };
      latest_data: (RedisCache | null)[];
    };
  };
};

type Monitor = SiteData & {
  latest: RedisCache | null;
};

type FilterType = "all" | "up" | "warning" | "down";

const MONITOR_LIMIT = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatInterval(sec: number): string {
  return `${sec / 60} min(s)`;
}

function formatCheckedAt(date: Date | string): string {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function normalizeStatus(
  status?: "Up" | "Down" | "Warning",
): "up" | "down" | "warning" {
  if (!status) return "down";
  return status.toLowerCase() as "up" | "down" | "warning";
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] grid-cols-[1fr_auto] gap-4 px-5 py-3.5 items-center border-b border-white/4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-3.5 w-36 bg-white/8 rounded" />
        <div className="h-2.5 w-52 bg-white/5 rounded" />
      </div>
      <div className="h-3 w-12 bg-white/8 rounded" />
      <div className="h-3 w-10 bg-white/8 rounded" />
      <div className="h-3 w-12 bg-white/8 rounded" />
      <div className="h-3 w-10 bg-white/8 rounded" />
      <div />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "up" | "down" | "warning" }) {
  const cfg = {
    up: {
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      label: "Up",
      pulse: false,
    },
    warning: {
      dot: "bg-amber-400",
      text: "text-amber-400",
      label: "Warning",
      pulse: true,
    },
    down: {
      dot: "bg-red-500",
      text: "text-red-400",
      label: "Down",
      pulse: true,
    },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`}
      />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="py-16 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 text-red-400"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3M8 11v.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-zinc-400 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MonitorList() {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const atLimit = monitors.length >= MONITOR_LIMIT;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${HTTP_URL}/api/v1/users/dashboard`, {
        credentials: "include",
      });

      if (res.status === 401) throw new Error("Unauthorized. Please log in.");
      if (res.status === 404) throw new Error("User not found.");
      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const json: DashboardResponse = await res.json();
      const { sites } = json.message.data.site_data;
      const latestArr = json.message.data.latest_data;

      const merged: Monitor[] = sites.map((site, idx) => ({
        ...site,
        latest: latestArr[idx] ?? null,
      }));

      setMonitors(merged);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch monitors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Optimistic insert — appends the new site immediately after creation.
  // latest is null until the first check runs and populates Redis.
  function handleMonitorCreated(newSite: SiteData) {
    setMonitors((prev) => [...prev, { ...newSite, latest: null }]);
  }

  // Derived counts
  const counts = monitors.reduce(
    (acc, m) => {
      const s = normalizeStatus(m.latest?.status);
      acc[s]++;
      return acc;
    },
    { up: 0, warning: 0, down: 0 },
  );

  // Filtered + searched list
  const filtered = monitors.filter((m) => {
    const s = normalizeStatus(m.latest?.status);
    if (filter !== "all" && s !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.url.toLowerCase().includes(q) || getHostname(m.url).includes(q);
    }
    return true;
  });

  return (
    <>
      <div className="bg-white/2 border border-white/[0.07] rounded-xl overflow-hidden animate-fade-up-d2">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/6">
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-white/4 rounded-lg p-0.5 flex-wrap">
            {(["all", "up", "warning", "down"] as const).map((f) => {
              const label =
                f === "all"
                  ? `All (${monitors.length})`
                  : `${f.charAt(0).toUpperCase() + f.slice(1)}${!loading ? ` (${counts[f]})` : ""}`;
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
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right side: search + refresh + add */}
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
                placeholder="Search monitors…"
                className="bg-white/4 border border-white/[0.07] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-cyan-400/40 focus:bg-white/6 transition-all w-40"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchDashboard}
              disabled={loading}
              title="Refresh"
              className="p-1.5 rounded-lg bg-white/4 border border-white/[0.07] hover:bg-white/8 text-zinc-500 hover:text-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M11 5h2.5V2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Add monitor */}
            <button
              onClick={() => !atLimit && setModalOpen(true)}
              disabled={atLimit || loading}
              title={
                atLimit
                  ? `Free plan limit: ${MONITOR_LIMIT} monitors`
                  : "Add monitor"
              }
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                atLimit
                  ? "bg-white/4 border border-white/[0.07] text-zinc-600 cursor-not-allowed"
                  : "bg-cyan-400 text-black hover:bg-cyan-300 hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]"
              }`}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-3.5 h-3.5"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
              {atLimit
                ? `${MONITOR_LIMIT}/${MONITOR_LIMIT} monitors`
                : "Add monitor"}
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-2.5 border-b border-white/4">
          {["Monitor", "Status", "Latency", "Method", "Checked", ""].map(
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

        {/* Body */}
        {loading ? (
          <div className="divide-y divide-white/4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDashboard} />
        ) : (
          <div className="divide-y divide-white/4">
            {filtered.map((m) => {
              const status = normalizeStatus(m.latest?.status);
              const latency = m.latest?.response_time_ms ?? null;
              const method = m.method.toUpperCase();

              return (
                <div
                  key={m.id}
                  className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] grid-cols-[1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-white/2 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/dashboard/monitor/${m.id}`)}
                >
                  {/* Name */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm text-white font-medium group-hover:text-cyan-400 transition-colors">
                        {getHostname(m.url)}
                      </span>
                      <span className="text-[10px] text-zinc-700 bg-white/4 px-1.5 py-0.5 rounded font-mono">
                        HTTPS
                      </span>
                      {m.timeout > 0 && (
                        <span className="text-[10px] text-zinc-700 bg-white/4 px-1.5 py-0.5 rounded font-mono hidden sm:inline-block">
                          {m.timeout / 1000}s timeout
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-600 font-mono truncate max-w-60">
                      {m.url}
                    </p>
                    {/* Mobile: status + latency inline */}
                    <div className="flex items-center gap-3 mt-1.5 md:hidden">
                      <StatusBadge status={status} />
                      {latency !== null && (
                        <span
                          className={`text-xs font-mono font-medium ${latency > 200 ? "text-amber-400" : "text-zinc-400"}`}
                        >
                          {latency}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <StatusBadge status={status} />
                  </div>

                  {/* Latency */}
                  <div className="hidden md:block">
                    {latency !== null ? (
                      <p
                        className={`text-sm font-mono font-medium ${latency > 200 ? "text-amber-400" : "text-white"}`}
                      >
                        {latency}ms
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-700 font-mono">—</p>
                    )}
                  </div>

                  {/* Method + interval */}
                  <div className="hidden md:block">
                    <span className="text-xs font-mono text-zinc-500 bg-white/4 px-1.5 py-0.5 rounded">
                      {method}
                    </span>
                    <p className="text-[10px] text-zinc-700 mt-0.5">
                      Every {formatInterval(m.intervalTime)}
                    </p>
                  </div>

                  {/* Last checked */}
                  <div className="hidden md:block">
                    <p className="text-xs text-zinc-600">
                      {m.latest?.created_at
                        ? formatCheckedAt(m.latest.created_at)
                        : "—"}
                    </p>
                    {m.latest?.error_reason && (
                      <p
                        className="text-[10px] text-red-400/80 mt-0.5 truncate max-w-30"
                        title={m.latest.error_reason}
                      >
                        {m.latest.error_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button
                      className="p-1.5 rounded-md hover:bg-white/6 text-zinc-600 hover:text-zinc-300 transition-all"
                      title="View details"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/monitor/${m.id}`);
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="w-3.5 h-3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
                        <circle cx="8" cy="8" r="2" />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-white/6 text-zinc-600 hover:text-zinc-300 transition-all"
                      title="Edit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="w-3.5 h-3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          d="M11 2l3 3-8 8H3v-3l8-8z"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
                      title="Delete"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="w-3.5 h-3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <p className="text-zinc-500 text-sm">
              {search
                ? `No monitors match "${search}".`
                : monitors.length === 0
                  ? "No monitors yet."
                  : "No monitors match this filter."}
            </p>
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
              >
                Clear search
              </button>
            ) : (
              monitors.length === 0 && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                >
                  Add your first monitor
                </button>
              )
            )}
          </div>
        )}

        {/* Footer summary */}
        {!loading && !error && monitors.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/6 bg-white/1.5">
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-zinc-600">
                {monitors.length}/{MONITOR_LIMIT} monitors
              </span>
              {counts.down > 0 && (
                <span className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
                  {counts.down} down
                </span>
              )}
              {counts.warning > 0 && (
                <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse inline-block" />
                  {counts.warning} degraded
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-700">Auto-refreshes on mount</p>
          </div>
        )}
      </div>

      <AddMonitorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(newSite) => {
          handleMonitorCreated(newSite);
          setModalOpen(false);
        }}
      />
    </>
  );
}
