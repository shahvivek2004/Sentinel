"use client";

export default function DashboardHeader() {
  return (
    <header className="h-14 border-b border-white/6 flex items-center justify-between px-6 bg-[#080C10] sticky top-0 z-10">
      <div>
        <h1 className="text-sm font-semibold text-white">Monitors</h1>
        <p className="text-xs text-zinc-600">
          Track your infrastructure uptime
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Global status pill */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-400/8 border border-emerald-400/15 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">
            All operational
          </span>
        </div>

        {/* Notification bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.07] bg-white/3 hover:bg-white/6 transition-all text-zinc-500 hover:text-zinc-300">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-4 h-4"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M8 1.5a4.5 4.5 0 00-4.5 4.5v2.5L2 10h12l-1.5-1.5V6A4.5 4.5 0 008 1.5zM6.5 12a1.5 1.5 0 003 0"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#080C10]" />
        </button>
      </div>
    </header>
  );
}
