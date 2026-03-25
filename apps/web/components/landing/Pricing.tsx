"use client";
import { useState } from "react";

const plans = [
  {
    name: "Hobby",
    monthly: 0,
    annual: 0,
    desc: "For side projects and personal sites.",
    features: [
      "5 monitors",
      "3-minute check interval",
      "5 alerting contacts",
      "30-day history",
      "Email alerts",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    monthly: 29,
    annual: 23,
    desc: "For growing products that need reliability.",
    features: [
      "50 monitors",
      "1-minute check interval",
      "Unlimited contacts",
      "90-day history",
      "Slack, PagerDuty, SMS",
      "SSL monitoring",
      "API assertions",
    ],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Scale",
    monthly: 99,
    annual: 79,
    desc: "For teams and mission-critical infrastructure.",
    features: [
      "Unlimited monitors",
      "30-second check interval",
      "Unlimited contacts",
      "1-year history",
      "All integrations",
      "Status pages (coming soon)",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    highlight: false,
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3 8l3.5 3.5L13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 border-t border-white/6">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3 font-medium">
            Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Simple, honest pricing.
          </h2>
          <p className="text-zinc-500 mt-3">
            No per-seat fees. No hidden limits.
          </p>

          <div className="inline-flex mt-6 bg-white/4 border border-white/8 rounded-lg p-1 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${!annual ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${annual ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Annual
              <span className="text-[10px] bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-6 transition-all ${plan.highlight ? "bg-cyan-400/4 border border-cyan-400/25 shadow-[0_0_50px_rgba(34,211,238,0.07)]" : "bg-white/2.5 border border-white/[0.07]"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-cyan-400 text-black text-[11px] font-bold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <p className="text-white font-semibold mb-1">{plan.name}</p>
              <p className="text-zinc-500 text-sm mb-5">{plan.desc}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-bold text-white">
                  ${annual ? plan.annual : plan.monthly}
                </span>
                <span className="text-zinc-500 text-sm">/mo</span>
              </div>
              <a
                href="#"
                className={`block text-center py-2.5 rounded-md text-sm font-medium mb-6 transition-all ${plan.highlight ? "bg-cyan-400 text-black hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)]" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`}
              >
                {plan.cta}
              </a>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-zinc-400"
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-zinc-600 mt-8">
          Need a custom plan?{" "}
          <a
            href="#"
            className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Talk to us
          </a>
        </p>
      </div>
    </section>
  );
}
