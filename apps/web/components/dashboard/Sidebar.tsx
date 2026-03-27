"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    label: "Monitors",
    href: "/dashboard",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="3" />
        <path
          d="M10 1v3M10 16v3M1 10h3M16 10h3M3.22 3.22l2.12 2.12M14.66 14.66l2.12 2.12M3.22 16.78l2.12-2.12M14.66 5.34l2.12-2.12"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Incidents",
    href: "/dashboard/incidents",
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
    badge: 2,
  },
  {
    label: "Status Pages",
    href: "/dashboard/status",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="3" width="16" height="14" rx="2" />
        <path d="M6 8h8M6 12h5" strokeLinecap="round" />
      </svg>
    ),
    soon: true,
  },
  {
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M13 10a3 3 0 11-6 0 3 3 0 016 0zM7.5 4.5a3 3 0 00-3 3v1M12.5 4.5a3 3 0 013 3v1M7.5 15.5a3 3 0 01-3-3v-1M12.5 15.5a3 3 0 003-3v-1"
          strokeLinecap="round"
        />
      </svg>
    ),
    soon: true,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M17.66 10c0-.34-.03-.67-.08-1l1.56-1.22a.5.5 0 00.12-.64l-1.48-2.56a.5.5 0 00-.61-.22l-1.84.74a7.02 7.02 0 00-1.72-1l-.28-1.96A.5.5 0 0012.83 2h-2.96a.5.5 0 00-.5.42l-.28 1.96a7.02 7.02 0 00-1.72 1l-1.84-.74a.5.5 0 00-.6.22L3.44 7.14a.5.5 0 00.12.64L5.12 9c-.05.33-.08.66-.08 1s.03.67.08 1l-1.56 1.22a.5.5 0 00-.12.64l1.48 2.56c.13.22.4.3.6.22l1.84-.74c.54.38 1.12.7 1.72 1l.28 1.96c.07.42.44.72.87.72h2.96c.43 0 .8-.3.87-.72l.28-1.96a7.02 7.02 0 001.72-1l1.84.74c.22.08.48 0 .6-.22l1.48-2.56a.5.5 0 00-.12-.64L17.58 11c.05-.33.08-.66.08-1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-white/6 bg-[#080C10] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-white/6">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
            <path
              d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z"
              stroke="#22D3EE"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M14 7L20.5 10.75V18.25L14 22L7.5 18.25V10.75L14 7Z"
              fill="#22D3EE"
              fillOpacity="0.12"
            />
            <circle cx="14" cy="14" r="3" fill="#22D3EE" />
          </svg>
          <span className="font-semibold text-white text-base tracking-tight">
            Sentinel
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative ${
                active
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/4"
              } ${item.soon ? "opacity-50 pointer-events-none" : ""}`}
            >
              <span
                className={
                  active
                    ? "text-cyan-400"
                    : "text-zinc-600 group-hover:text-zinc-400 transition-colors"
                }
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] bg-red-500/20 text-red-400 font-semibold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {item.soon && (
                <span className="text-[9px] bg-white/6 text-zinc-600 px-1.5 py-0.5 rounded-full font-medium">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/6 space-y-1">
        {/* Plan badge */}
        {/* <div className="px-3 py-2 rounded-lg bg-cyan-400/6 border border-cyan-400/10 mb-3">
          <p className="text-[10px] text-zinc-500 mb-0.5">Current plan</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white font-medium">Hobby</span>
            <Link
              href="/dashboard/billing"
              className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Upgrade →
            </Link>
          </div>
          <div className="mt-2 h-1 bg-white/6 rounded-full overflow-hidden">
            <div className="h-full w-[60%] bg-cyan-400 rounded-full" />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">3 / 5 monitors used</p>
        </div> */}

        {/* User */}
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition-all group">
          <div className="w-7 h-7 rounded-full bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-xs font-semibold text-cyan-400 shrink-0">
            A
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-zinc-300 font-medium truncate">
              Ada Lovelace
            </p>
            <p className="text-[10px] text-zinc-600 truncate">
              ada@company.com
            </p>
          </div>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
