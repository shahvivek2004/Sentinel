import Link from "next/link";

const INCIDENTS = [
  {
    id: 1,
    monitor: "cdn.myapp.com",
    title: "High response time detected",
    status: "ongoing",
    started: "2h 14m ago",
    duration: "ongoing",
    severity: "degraded",
  },
  {
    id: 2,
    monitor: "api.myapp.com",
    title: "HTTP 503 from Virginia region",
    status: "resolved",
    started: "2 days ago",
    duration: "4m 22s",
    severity: "down",
  },
  {
    id: 3,
    monitor: "myapp.com",
    title: "SSL certificate expiry warning",
    status: "resolved",
    started: "5 days ago",
    duration: "Acknowledged",
    severity: "degraded",
  },
];

export default function RecentIncidents() {
  return (
    <div className="bg-white/2 border border-white/[0.07] rounded-xl overflow-hidden animate-fade-up-d3">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">Recent Incidents</p>
          <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
            1 active
          </span>
        </div>
        <Link
          href="/dashboard/incidents"
          className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="divide-y divide-white/4">
        {INCIDENTS.map((inc) => (
          <div
            key={inc.id}
            className="px-5 py-3.5 hover:bg-white/2 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      inc.severity === "down"
                        ? "bg-red-500"
                        : inc.severity === "degraded"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    } ${inc.status === "ongoing" ? "animate-pulse" : ""}`}
                  />
                  <p className="text-sm text-zinc-300 font-medium truncate group-hover:text-white transition-colors">
                    {inc.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3.5">
                  <span className="font-mono text-[11px] text-zinc-600">
                    {inc.monitor}
                  </span>
                  <span className="text-zinc-800">·</span>
                  <span className="text-[11px] text-zinc-600">
                    {inc.started}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    inc.status === "ongoing"
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-emerald-400/10 text-emerald-400"
                  }`}
                >
                  {inc.status === "ongoing" ? "Ongoing" : "Resolved"}
                </span>
                <p className="text-[10px] text-zinc-700 mt-1">{inc.duration}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
