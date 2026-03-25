"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { InputField, PasswordStrength } from "./InputField";
import { requiredBodySignup } from "@repo/zod/validation";
import axios from "axios";
import { useRouter } from "next/navigation";

const HTTP_URL = process.env.NEXT_PUBLIC_HTTP_URL;

type FormState = "idle" | "loading" | "error" | "success";

export default function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [state, setState] = useState<FormState>("idle");

  const clearError = (key: string) =>
    setErrors((v) => {
      const n = { ...v };
      delete n[key];
      return n;
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = requiredBodySignup.safeParse({
      username: name,
      email,
      password,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      if (fieldErrors.username) {
        fieldErrors.name = fieldErrors.username;
        delete fieldErrors.username;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!agreed) {
      setErrors({ agreed: "You must accept the terms to continue" });
      return;
    }

    setState("loading");

    try {
      await axios.post(`${HTTP_URL}/api/v1/users/signup`, result.data, {
        withCredentials: true,
      });
      setState("success");
      router.push("/signin");
    } catch (err) {
      setState("error");
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ??
          "Something went wrong. Please try again.";
        if (msg.toLowerCase().includes("already exist")) {
          setErrors({ email: "An account with this email already exists." });
        } else {
          setServerError(msg);
        }
      } else {
        setServerError("Network error. Check your connection.");
      }
    }
  };

  if (state === "success") {
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
              d="M4 12l5 5L20 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 max-w-xs mx-auto">
          We sent a confirmation link to{" "}
          <span className="text-white font-medium">{email}</span>. Click it to
          activate your account.
        </p>
        <p className="text-xs text-zinc-600">
          Didn&apos;t get it?{" "}
          <button
            onClick={() => setState("idle")}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Resend email
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/15 rounded-full px-3 py-1 mb-4">
          <span className="text-xs text-cyan-400 font-medium">
            Free forever for 5 monitors
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
          Create your account
        </h1>
        <p className="text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3 mb-5">
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

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <InputField
          label="Full name"
          type="text"
          placeholder="Ada Lovelace"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
          autoComplete="name"
          autoFocus
        />

        <InputField
          label="Work email"
          type="email"
          placeholder="ada@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError("email");
          }}
          error={errors.email}
          autoComplete="email"
        />

        <InputField
          label="Password"
          type="password"
          placeholder="Min. 10 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError("password");
          }}
          error={errors.password}
          autoComplete="new-password"
        />
        <PasswordStrength password={password} />

        {/* Terms */}
        <div>
          <label
            className={`flex items-start gap-3 cursor-pointer group ${errors.agreed ? "text-red-400" : ""}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  clearError("agreed");
                }}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center ${agreed ? "bg-cyan-400 border-cyan-400" : errors.agreed ? "border-red-500/60 bg-red-500/5" : "border-white/20 bg-white/4 group-hover:border-white/30"}`}
              >
                {agreed && (
                  <svg
                    className="w-2.5 h-2.5 text-black"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M2 5l2.5 2.5L8 3" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-zinc-500 leading-relaxed">
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.agreed && (
            <p className="text-xs text-red-400 mt-1.5 ml-7">{errors.agreed}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={state === "loading"}
          className="w-full flex items-center justify-center gap-2 bg-cyan-400 text-black font-semibold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none mt-1"
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* Trust signals */}
      {/* <div className="mt-7 pt-6 border-t border-white/5 grid grid-cols-3 gap-3">
        {[
          { icon: "🔒", label: "SOC 2 ready" },
          { icon: "🌍", label: "GDPR compliant" },
          { icon: "⚡", label: "99.99% uptime" },
        ].map((t) => (
          <div key={t.label} className="text-center">
            <div className="text-base mb-1">{t.icon}</div>
            <p className="text-[10px] text-zinc-600 leading-tight">{t.label}</p>
          </div>
        ))}
      </div> */}
    </div>
  );
}
