const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    title: "Multi-region checks",
    description:
      "Every monitor runs from 7+ PoPs across North America, Europe, Asia-Pacific and South America. A single region outage won't trigger a false alarm.",
    tag: "Global",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: "Instant alerting",
    description:
      "Get notified via Slack, PagerDuty, email, SMS, or webhook the moment a check fails. Configurable escalation policies keep the right people informed.",
    tag: "Alerting",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Deep performance insights",
    description:
      "Track DNS resolution, TCP connect, TLS handshake, TTFB, and full response time separately. Pinpoint the exact layer that slowed down.",
    tag: "Analytics",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "SSL & domain monitoring",
    description:
      "Automatically track certificate expiry for every HTTPS endpoint. Get alerted 30, 14, and 7 days before expiry — never lose trust with your users.",
    tag: "SSL",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "API monitoring",
    description:
      "Validate JSON response bodies, status codes, and response times with custom assertions. Monitor your entire API surface, not just availability.",
    tag: "API",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Status pages — coming soon",
    description:
      "Beautiful, customizable public status pages that automatically reflect your monitor data. Let your users self-serve instead of flooding your inbox.",
    tag: "Soon",
    muted: true,
  },
];

export default function Features() {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3 font-medium">
          What Sentinel does
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Everything you need.
          <br />
          <span className="text-zinc-500">Nothing you don&apos;t.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className={`relative group rounded-xl border p-6 transition-all duration-300 ${
              f.muted
                ? "border-white/5 bg-white/1 opacity-60"
                : "border-white/7 bg-white/2.5 hover:border-cyan-400/20 hover:bg-white/4"
            }`}
          >
            <div
              className={`inline-flex p-2 rounded-lg mb-4 ${
                f.muted
                  ? "bg-white/5 text-zinc-600"
                  : "bg-cyan-400/10 text-cyan-400"
              }`}
            >
              {f.icon}
            </div>

            <div className="flex items-start justify-between mb-2">
              <h3 className="text-white font-semibold">{f.title}</h3>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                  f.tag === "Soon"
                    ? "bg-zinc-800 text-zinc-500"
                    : "bg-cyan-400/10 text-cyan-400"
                }`}
              >
                {f.tag}
              </span>
            </div>

            <p className="text-sm text-zinc-500 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
