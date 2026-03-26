"use client";

import { useEffect, useState } from "react";
import { HTTP_URL } from "../../../proxy";

// ── Types ─────────────────────────────────────────────────────

type Incident = {
  id: string;
  siteId: string;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  region_id?: number; // IMPORTANT: ensure backend sends this
  site: {
    id: string;
    url: string;
  };
};

// ── Region Config ─────────────────────────────────────────────

const REGION_MAP: Record<number, string> = {
  1: "AS",
  2: "US",
  3: "EU",
  4: "AU",
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
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}

function formatTime(date: string) {
  const d = new Date(date);
  return d.toLocaleString();
}

// ── Grouping Logic (🔥 key part) ──────────────────────────────

type GroupedIncident = Incident & {
  regions: number[];
};

function groupIncidents(incidents: Incident[]) {
  const groups: Record<string, Incident & { regions: Set<number> }> = {};

  for (const inc of incidents) {
    const timeBucket = Math.floor(new Date(inc.startedAt).getTime() / 10000); // 10s window

    const key = `${inc.siteId}-${timeBucket}`;

    if (!groups[key]) {
      groups[key] = {
        ...inc,
        regions: new Set<number>(),
      };
    }

    if (inc.region_id) {
      groups[key].regions.add(inc.region_id);
    }
  }

  return Object.values(groups).map((g) => ({
    ...g,
    regions: REGION_ORDER.filter((r) => g.regions.has(r)),
  }));
}

// ── UI Components ─────────────────────────────────────────────

function StatusBadge({ resolved }: { resolved: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          resolved ? "bg-emerald-400" : "bg-red-500 animate-pulse"
        }`}
      />
      <span
        className={`text-xs font-medium ${
          resolved ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {resolved ? "Resolved" : "Ongoing"}
      </span>
    </div>
  );
}

function RegionTags({ regions }: { regions: number[] }) {
  if (!regions.length) return null;

  return (
    <div className="flex items-center gap-1 ml-1">
      {regions.map((r) => (
        <span
          key={r}
          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 border border-white/10"
        >
          {REGION_MAP[r]}
        </span>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex justify-between items-center px-5 py-3 border-b border-white/4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-40 bg-white/8 rounded" />
        <div className="h-2.5 w-28 bg-white/5 rounded" />
      </div>
      <div className="h-3 w-20 bg-white/8 rounded" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function RecentIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

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

  const grouped = groupIncidents(incidents);

  return (
    <div className="bg-white/2 border border-white/[0.07] overflow-hidden animate-fade-up-d2">
      {/* Header */}
      <header className="h-14 border-b border-white/6 flex items-center justify-between px-6 bg-[#080C10] sticky top-0 z-10">
        <div>
          <h2 className="text-sm text-zinc-300 font-medium">
            Recent Incidents
          </h2>
          <p className="text-xs text-zinc-600">
            Track your most recent incidents
          </p>
        </div>
      </header>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-white/4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-zinc-500 text-sm">No incidents recorded</p>
        </div>
      ) : (
        <div className="divide-y divide-white/4">
          {grouped.map((incident: GroupedIncident) => {
            const resolved = !!incident.resolvedAt;

            return (
              <div
                key={incident.id}
                className="flex justify-between items-center px-5 py-3.5 hover:bg-white/2 transition-colors group"
              >
                {/* Left */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm text-white font-medium group-hover:text-cyan-400 transition-colors">
                      {getHostname(incident.site.url)}
                    </span>

                    <StatusBadge resolved={resolved} />

                    <RegionTags regions={incident.regions || []} />
                  </div>

                  <p className="text-[11px] text-zinc-600 font-mono">
                    Started: {formatTime(incident.startedAt)}
                  </p>
                </div>

                {/* Right */}
                <div className="text-right">
                  <p className="text-sm text-white font-mono">
                    {resolved ? formatDuration(incident.durationSeconds) : "—"}
                  </p>

                  <p className="text-[10px] text-zinc-600">
                    {resolved ? "Duration" : "In progress"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && grouped.length > 0 && (
        <div className="px-5 py-3 border-t border-white/6 bg-white/1.5 text-[11px] text-zinc-600">
          Showing latest {grouped.length} incidents
        </div>
      )}
    </div>
  );
}
