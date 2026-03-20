"use client";
import { useState, InputHTMLAttributes, forwardRef } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, hint, className = "", type = "text", ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={[
              "w-full bg-white/4 border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600",
              "outline-none transition-all duration-200",
              "hover:border-white/20 hover:bg-white/6",
              error
                ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                : focused
                  ? "border-cyan-400/60 ring-2 ring-cyan-400/10 bg-white/6"
                  : "border-white/8",
              isPassword ? "pr-10" : "",
              className,
            ].join(" ")}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M17.94 10C17.03 12.81 13.79 15 10 15s-7.03-2.19-7.94-5M10 5a7.94 7.94 0 017.94 5"
                    strokeLinecap="round"
                  />
                  <path d="M3 3l14 14" strokeLinecap="round" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M2.06 10C2.97 7.19 6.21 5 10 5s7.03 2.19 7.94 5C17.03 12.81 13.79 15 10 15S2.97 12.81 2.06 10z"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="10" r="2.5" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="h-4 mt-1">
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 4.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm0-2a.75.75 0 110 1.5.75.75 0 010-1.5z" />
              </svg>
              {error}
            </p>
          )}
          {hint && !error && <p className="text-xs text-zinc-600">{hint}</p>}
        </div>
      </div>
    );
  },
);

InputField.displayName = "InputField";

/* ─── Password strength meter ─────────────────────────────────── */
function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-amber-400" };
  if (score <= 3) return { score, label: "Good", color: "bg-cyan-400" };
  return { score, label: "Strong", color: "bg-emerald-400" };
}

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = password ? getStrength(password) : { score: 0, label: "", color: "" };
  const filled = Math.min(score, 4);

  return (
    <div className="mt-2 space-y-1.5 min-h-8">  {/* always rendered, always takes space */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${password && i < filled ? color : "bg-white/6"}`}
          />
        ))}
      </div>
      <p className={`text-xs transition-all duration-300 ${!password ? "opacity-0" : "opacity-100"} ${score <= 1 ? "text-red-400" : score <= 2 ? "text-amber-400" : score <= 3 ? "text-cyan-400" : "text-emerald-400"}`}>
        {label || "—"} {password ? "password" : ""}
      </p>
    </div>
  );
}
