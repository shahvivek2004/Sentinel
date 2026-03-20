import Link from "next/link";

const links: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Resources: ["Documentation", "API Reference", "Status", "Blog"],
  Company: ["About", "Careers", "Privacy", "Terms"],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/6 pt-14 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
                <path
                  d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z"
                  stroke="#22D3EE"
                  strokeWidth="1.5"
                  fill="none"
                />
                <circle cx="14" cy="14" r="3" fill="#22D3EE" />
              </svg>
              <span className="font-semibold text-white text-base">Sentinel</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Uptime monitoring built for modern engineering teams.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-xs text-zinc-600">All systems operational</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([col, items]) => (
            <div key={col}>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium">
                {col}
              </p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Sentinel. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Built for engineers who care about reliability.
          </p>
        </div>
      </div>
    </footer>
  );
}
