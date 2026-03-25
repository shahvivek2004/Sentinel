"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080C10]/90 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
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
          <span className="font-semibold text-white tracking-tight text-lg">
            Sentinel
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Pricing", "Docs", "Blog"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="hidden md:block text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-cyan-400 text-black font-semibold px-4 py-2 rounded-md hover:bg-cyan-300 transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]"
          >
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}
