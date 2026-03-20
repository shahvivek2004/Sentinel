"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { InputField } from "./InputField";
import { requiredBodySignin } from "@repo/zod/validation";
import axios from "axios";
import { useRouter } from "next/navigation";

type FormState = "idle" | "loading" | "error" | "success";

const HTTP_URL = process.env.NEXT_PUBLIC_HTTP_URL;

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [state, setState] = useState<FormState>("idle");
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = requiredBodySignin.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setState("loading");

    try {
      await axios.post(`${HTTP_URL}/api/v1/users/signin`, result.data, {
        withCredentials: true,
      });
      setState("success");
      router.push("/dashboard");
    } catch (err) {
      setState("error");
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ??
          "Something went wrong. Please try again.";
        if (msg.includes("Wrong Password")) {
          setErrors({ password: "Incorrect password." });
        } else if (msg.includes("don't exist")) {
          setErrors({ email: "No account found with this email." });
        } else {
          setServerError(msg);
        }
      } else {
        setServerError("Network error. Check your connection.");
      }
    }
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Sign up free
          </Link>
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
          <svg
            className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <InputField
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((v) => ({ ...v, email: undefined }));
          }}
          error={errors.email}
          autoComplete="email"
          autoFocus
        />

        <div className="space-y-1.5">
          <InputField
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((v) => ({ ...v, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full flex items-center justify-center gap-2 bg-cyan-400 text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {state === "loading" ? (
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
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/6" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#080C10] px-3 text-xs text-zinc-700">
            Need help?
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-600 text-center leading-relaxed">
        Having trouble signing in?{" "}
        <Link
          href="mailto:support@sentinel.sh"
          className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
        >
          Contact support
        </Link>
      </p>
    </div>
  );
}
