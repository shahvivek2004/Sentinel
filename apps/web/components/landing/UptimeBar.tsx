export default function UptimeBar() {
  const stats = [
    { value: "4+", label: "Global locations" },
    { value: "50K+", label: "Monitors active" },
    { value: "99.98%", label: "Average uptime" },
    { value: "<30s", label: "Alert delivery" },
    { value: "2.4B+", label: "Checks per month" },
  ];

  return (
    <section className="border-y border-white/6 bg-white/2 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
