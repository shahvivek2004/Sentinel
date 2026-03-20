export default function CTA() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-125 h-50 bg-cyan-500/10 blur-[80px] pointer-events-none" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5">
          Your next outage is coming.
          <br />
          <span className="text-zinc-500">Will you hear about it first?</span>
        </h2>
        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          Join thousands of engineers who trust Sentinel to watch their
          infrastructure around the clock.
        </p>
        <a
          href="/signin"
          className="inline-flex items-center gap-2 bg-cyan-400 text-black font-semibold px-10 py-4 rounded-md text-base hover:bg-cyan-300 transition-all duration-200 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]"
        >
          Start monitoring for free
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <p className="mt-4 text-sm text-zinc-600">
          5 monitors free forever · Up and running in 60 seconds
        </p>
      </div>
    </section>
  );
}
