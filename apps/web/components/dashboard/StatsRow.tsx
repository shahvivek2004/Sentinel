const STATS = [
  {
    label: "Average Uptime",
    value: "99.98%",
    delta: "+0.02%",
    positive: true,
    sub: "Last 30 days",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M2 10h4l3-7 4 14 3-7h2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Total Checks",
    value: "1.24M",
    delta: "+18k today",
    positive: true,
    sub: "This month",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Incidents",
    value: "2",
    delta: "1 resolved",
    positive: false,
    sub: "Last 7 days",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M10 2L2 17h16L10 2z" strokeLinejoin="round" />
        <path d="M10 8v4M10 14h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Avg Response",
    value: "61ms",
    delta: "-4ms",
    positive: true,
    sub: "Last 24 hours",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M3 10a7 7 0 1014 0A7 7 0 003 10zM10 7v3l2 2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function StatsRow() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className="bg-white/2.5 border border-white/[0.07] rounded-xl p-4 animate-fade-up"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <div className="p-1.5 rounded-lg bg-white/4 text-zinc-500">
              {s.icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none mb-1">
            {s.value}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-medium ${s.positive ? "text-emerald-400" : "text-amber-400"}`}
            >
              {s.delta}
            </span>
            <span className="text-xs text-zinc-700">{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
