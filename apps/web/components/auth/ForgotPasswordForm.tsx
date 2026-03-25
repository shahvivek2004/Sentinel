"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { InputField } from "./InputField";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Email is required");
    if (!/\S+@\S+\.\S+/.test(email))
      return setError("Enter a valid email address");
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="animate-fade-up text-center">
        <div className="w-14 h-14 bg-cyan-400/10 border border-cyan-400/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-7 h-7 text-cyan-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-xs mx-auto">
          If an account exists for{" "}
          <span className="text-white font-medium">{email}</span>, you&apos;ll
          receive a reset link shortly.
        </p>
        <Link
          href="/signin"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <div className="w-11 h-11 bg-white/4 border border-white/8 rounded-xl flex items-center justify-center mb-5">
          <svg
            className="w-5 h-5 text-zinc-400"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M10 2a4 4 0 00-4 4v1H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm0 2a2 2 0 012 2v1H8V6a2 2 0 012-2zm0 8a1 1 0 110 2 1 1 0 010-2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
          Reset password
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <InputField
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          error={error}
          autoComplete="email"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-400 text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                />
              </svg>
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Remember it?{" "}
        <Link
          href="/signin"
          className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
