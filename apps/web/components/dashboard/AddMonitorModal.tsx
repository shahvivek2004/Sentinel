"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { requiredBodyUrlPost } from "@repo/zod/validation";
// ─────────────────────────────────────────────────────────────────────────────
// Zod schema — mirrors server-side exactly
// ─────────────────────────────────────────────────────────────────────────────

type FormValues = {
  url: string;
  intervalTime: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  timeout: string;
  sslVerify: boolean;
  followRedirect: boolean;
  body: string;
  header: string;
  maintenanceStartMin: string;
  maintenanceEndMin: string;
  maintenanceDays: string[];
};

type FieldErrors = Partial<Record<keyof FormValues | "root", string>>;

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const INTERVAL_PRESETS = [
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
  { label: "15m", value: 900 },
];

const TIMEOUT_PRESETS = [
  { label: "1s", value: 1000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "15s", value: 15000 },
];

const DEFAULTS: FormValues = {
  url: "",
  intervalTime: "60",
  method: "GET",
  timeout: "5000",
  sslVerify: true,
  followRedirect: true,
  body: "",
  header: "",
  maintenanceStartMin: "",
  maintenanceEndMin: "",
  maintenanceDays: [],
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidJson(s: string) {
  if (!s.trim()) return true;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function timeToMinutes(t: string): number | null {
  const [h, m] = t.split(":").map(Number);
  if (!h || !m || isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-[11px] text-zinc-500 uppercase tracking-widest font-medium mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[11px] text-red-400 mt-1">{msg}</p>;
}

function Input({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/4 border rounded-lg px-3 py-2 text-sm text-white
        placeholder-zinc-700 outline-none transition-all
        ${
          error
            ? "border-red-500/40 focus:border-red-500/60"
            : "border-white/[0.07] focus:border-cyan-400/40 focus:bg-white/6"
        } ${className}`}
    />
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full group"
    >
      <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
        {label}
      </span>
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${value ? "bg-cyan-500" : "bg-white/10"}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
    </button>
  );
}

function Section({
  title,
  children,
  collapsible = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white/2
          ${collapsible ? "cursor-pointer hover:bg-white/4 transition-colors" : "cursor-default"}`}
      >
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {title}
        </span>
        {collapsible && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M4 6l4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

// Matches SiteData in MonitorList
type CreatedSite = {
  id: string;
  primeRegionId: string;
  url: string;
  timeAdded: Date;
  intervalTime: number;
  method: string;
  timeout: number;
};

interface AddMonitorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (site: CreatedSite) => void;
}

export default function AddMonitorModal({
  open,
  onClose,
  onSuccess,
}: AddMonitorModalProps) {
  const [values, setValues] = useState<FormValues>(DEFAULTS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setValues(DEFAULTS);
      setErrors({});
      setDone(false);
      setSubmitting(false);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const set = useCallback(
    <K extends keyof FormValues>(k: K, v: FormValues[K]) => {
      setValues((prev) => ({ ...prev, [k]: v }));
      setErrors((prev) => ({ ...prev, [k]: undefined }));
    },
    [],
  );

  // ── Client-side validation ────────────────────────────────────────────────

  function validate(): FieldErrors {
    const errs: FieldErrors = {};

    const parsed = requiredBodyUrlPost.safeParse({
      url: values.url,
      intervalTime: Number(values.intervalTime),
      method: values.method,
      timeout: Number(values.timeout),
      sslVerify: values.sslVerify,
      followRedirect: values.followRedirect,
      maintenanceStartMin: values.maintenanceStartMin
        ? timeToMinutes(values.maintenanceStartMin)
        : null,
      maintenanceEndMin: values.maintenanceEndMin
        ? timeToMinutes(values.maintenanceEndMin)
        : null,
      maintenanceDays: values.maintenanceDays,
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormValues;
        if (!errs[field]) errs[field] = issue.message;
      });
    }

    if (values.body && !isValidJson(values.body)) errs.body = "Invalid JSON";
    if (values.header && !isValidJson(values.header))
      errs.header = "Invalid JSON";

    // Maintenance window: either both set or neither
    const hasStart = !!values.maintenanceStartMin;
    const hasEnd = !!values.maintenanceEndMin;
    if (hasStart !== hasEnd) {
      errs.maintenanceEndMin = "Both start and end are required";
    }

    return errs;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        url: values.url,
        intervalTime: Number(values.intervalTime),
        method: values.method,
        timeout: Number(values.timeout),
        sslVerify: values.sslVerify,
        followRedirect: values.followRedirect,
        maintenanceDays: values.maintenanceDays,
        maintenanceStartMin: values.maintenanceStartMin
          ? timeToMinutes(values.maintenanceStartMin)
          : null,
        maintenanceEndMin: values.maintenanceEndMin
          ? timeToMinutes(values.maintenanceEndMin)
          : null,
      };
      if (values.body.trim()) payload.body = JSON.parse(values.body);
      if (values.header.trim()) payload.header = JSON.parse(values.header);

      const res = await fetch(`${BASE}/sites/url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.status === 403) {
        setErrors({
          root:
            json.message ??
            "Free plan limit reached. Upgrade to add more monitors.",
        });
        return;
      }
      if (!res.ok) {
        setErrors({ root: json.message ?? `Error ${res.status}` });
        return;
      }

      setDone(true);
      // API returns { siteId } — reconstruct a CreatedSite for optimistic insert
      onSuccess?.({
        id: json.message.data.id,
        primeRegionId: "04c66f73-92fe-4794-ae20-b81e271590b9", // default from schema
        url: values.url,
        timeAdded: new Date(),
        intervalTime: Number(values.intervalTime),
        method: values.method,
        timeout: Number(values.timeout),
      });
      setTimeout(onClose, 1400);
    } catch {
      setErrors({ root: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden
          border border-white/8 shadow-2xl"
        style={{ background: "#0c1117" }}
      >
        {/* Subtle top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/30 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">New Monitor</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Configure your endpoint check
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/4
              border border-white/[0.07] text-zinc-500 hover:text-white hover:bg-white/8
              transition-all"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-3.5 h-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <div
              className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20
              flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6 text-emerald-400"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-white font-medium">Monitor created</p>
            <p className="text-zinc-600 text-sm">
              Your endpoint is now being tracked.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              {/* Root error */}
              {errors.root && (
                <div
                  className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20
                  rounded-lg px-4 py-3"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3M8 11v.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm text-red-400">{errors.root}</p>
                </div>
              )}

              {/* ── Core ────────────────────────────────────────────────── */}
              <Section title="Endpoint">
                {/* URL */}
                <div>
                  <Label required>URL</Label>
                  <Input
                    value={values.url}
                    onChange={(v) => set("url", v)}
                    placeholder="https://api.example.com/health"
                    error={errors.url}
                  />
                  <FieldError msg={errors.url} />
                </div>

                {/* Method + Interval row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>Method</Label>
                    <div className="flex flex-wrap gap-1">
                      {METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => set("method", m)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                            values.method === m
                              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                              : "bg-white/4 border border-white/[0.07] text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label required>Check interval</Label>
                    <div className="flex flex-wrap gap-1">
                      {INTERVAL_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => set("intervalTime", String(p.value))}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            values.intervalTime === String(p.value)
                              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                              : "bg-white/4 border border-white/[0.07] text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <FieldError msg={errors.intervalTime} />
                  </div>
                </div>

                {/* Timeout */}
                <div>
                  <Label required>Timeout</Label>
                  <div className="flex flex-wrap gap-1">
                    {TIMEOUT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => set("timeout", String(p.value))}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          values.timeout === String(p.value)
                            ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                            : "bg-white/4 border border-white/[0.07] text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <FieldError msg={errors.timeout} />
                </div>
              </Section>

              {/* ── Options ─────────────────────────────────────────────── */}
              <Section title="Options">
                <Toggle
                  value={values.sslVerify}
                  onChange={(v) => set("sslVerify", v)}
                  label="Verify SSL certificate"
                />
                <div className="h-px bg-white/5" />
                <Toggle
                  value={values.followRedirect}
                  onChange={(v) => set("followRedirect", v)}
                  label="Follow redirects"
                />
              </Section>

              {/* ── Request body / headers ───────────────────────────────── */}
              <Section title="Request payload" collapsible>
                <div>
                  <Label>
                    Body{" "}
                    <span className="normal-case text-zinc-700">(JSON)</span>
                  </Label>
                  <textarea
                    value={values.body}
                    onChange={(e) => set("body", e.target.value)}
                    rows={3}
                    placeholder={'{\n  "key": "value"\n}'}
                    className={`w-full bg-white/4 border rounded-lg px-3 py-2 text-sm
                      font-mono text-white placeholder-zinc-800 outline-none resize-none transition-all
                      ${
                        errors.body
                          ? "border-red-500/40 focus:border-red-500/60"
                          : "border-white/[0.07] focus:border-cyan-400/40 focus:bg-white/6"
                      }`}
                  />
                  <FieldError msg={errors.body} />
                </div>
                <div>
                  <Label>
                    Headers{" "}
                    <span className="normal-case text-zinc-700">(JSON)</span>
                  </Label>
                  <textarea
                    value={values.header}
                    onChange={(e) => set("header", e.target.value)}
                    rows={3}
                    placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
                    className={`w-full bg-white/4 border rounded-lg px-3 py-2 text-sm
                      font-mono text-white placeholder-zinc-800 outline-none resize-none transition-all
                      ${
                        errors.header
                          ? "border-red-500/40 focus:border-red-500/60"
                          : "border-white/[0.07] focus:border-cyan-400/40 focus:bg-white/6"
                      }`}
                  />
                  <FieldError msg={errors.header} />
                </div>
              </Section>

              {/* ── Maintenance window ───────────────────────────────────── */}
              <Section title="Maintenance window" collapsible>
                <p className="text-xs text-zinc-600 -mt-1">
                  Checks during this window won&apos;t trigger alerts.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={values.maintenanceStartMin}
                      onChange={(v) => set("maintenanceStartMin", v)}
                      error={errors.maintenanceStartMin}
                    />
                  </div>
                  <div>
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={values.maintenanceEndMin}
                      onChange={(v) => set("maintenanceEndMin", v)}
                      error={errors.maintenanceEndMin}
                    />
                    <FieldError msg={errors.maintenanceEndMin} />
                  </div>
                </div>

                <div>
                  <Label>Active days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => {
                      const active = values.maintenanceDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? values.maintenanceDays.filter((x) => x !== d)
                              : [...values.maintenanceDays, d];
                            set("maintenanceDays", next);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            active
                              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                              : "bg-white/4 border border-white/[0.07] text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {DAY_SHORT[d]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div
              className="sticky bottom-0 px-6 py-4 border-t border-white/6
              flex items-center justify-between gap-3"
              style={{ background: "#0c1117" }}
            >
              <p className="text-[11px] text-zinc-700">
                Free plan: up to 5 monitors
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-200
                    bg-white/4 border border-white/[0.07] hover:bg-white/[0.07] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-400 text-black
                    text-sm font-semibold hover:bg-cyan-300 transition-all
                    hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          d="M13.5 8A5.5 5.5 0 1 1 8 2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Creating…
                    </>
                  ) : (
                    "Create monitor"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
