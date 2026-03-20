const integrations = [
  { name: "Slack", color: "#4A154B", letter: "S" },
  { name: "PagerDuty", color: "#06AC38", letter: "P" },
  { name: "Opsgenie", color: "#FF6600", letter: "O" },
  { name: "Webhook", color: "#3B82F6", letter: "W" },
  { name: "Email", color: "#6B7280", letter: "E" },
  { name: "SMS", color: "#8B5CF6", letter: "S" },
  { name: "Discord", color: "#5865F2", letter: "D" },
  { name: "Telegram", color: "#26A5E4", letter: "T" },
  { name: "Datadog", color: "#774AA4", letter: "D" },
  { name: "GitHub", color: "#161514", letter: "G" },
];

export default function Integrations() {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <div className="text-center mb-14">
        <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3 font-medium">
          Connects with your stack
        </p>
        <h2 className="text-4xl font-bold text-white tracking-tight">
          Alert where your team lives.
        </h2>
        <p className="text-zinc-500 mt-4 max-w-xl mx-auto">
          Sentinel integrates with every tool in your on-call workflow. One click
          to connect — no custom code required.
        </p>
      </div>

      {/* Integration grid */}
      <div className="flex flex-wrap justify-center gap-3">
        {integrations.map((i) => (
          <div
            key={i.name + i.color}
            className="flex items-center gap-2.5 bg-white/3 border border-white/[0.07] rounded-lg px-4 py-2.5 hover:border-white/15 transition-all duration-200 group"
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: i.color }}
            >
              {i.letter}
            </div>
            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
              {i.name}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2.5 bg-white/1.5 border border-dashed border-white/[0.07] rounded-lg px-4 py-2.5">
          <span className="text-sm text-zinc-600">+ many more</span>
        </div>
      </div>

      {/* Notification preview */}
      <div className="mt-14 grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Slack-style alert */}
        <div className="bg-[#1A1D21] rounded-lg border border-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
              S
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">Sentinel</span>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">App</span>
                <span className="text-[10px] text-zinc-600 ml-auto">just now</span>
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <p className="text-xs font-semibold text-red-400 mb-0.5">🔴 Monitor DOWN</p>
                <p className="text-xs text-zinc-400">
                  <span className="font-mono text-zinc-300">api.myapp.com</span> is unreachable from 3 regions.
                </p>
                <p className="text-xs text-zinc-600 mt-1">HTTP 503 · 4 min ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email-style alert */}
        <div className="bg-white/3 rounded-lg border border-white/5 p-4">
          <div className="border-b border-white/5 pb-3 mb-3">
            <p className="text-xs text-zinc-600">From: alerts@sentinel.sh</p>
            <p className="text-xs text-zinc-600">Subject: <span className="text-zinc-400">🔴 api.myapp.com is DOWN</span></p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your monitor <span className="font-mono text-zinc-300">api.myapp.com</span> is reporting 
            a failure from <span className="text-white">Frankfurt</span>, <span className="text-white">Singapore</span>, 
            and <span className="text-white">Virginia</span>.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded">View incident</span>
            <span className="text-[10px] bg-white/5 text-zinc-500 px-2 py-1 rounded">Acknowledge</span>
          </div>
        </div>
      </div>
    </section>
  );
}
