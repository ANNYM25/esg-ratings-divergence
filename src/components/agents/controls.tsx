"use client";

import { cn } from "@/lib/ui";

export function RunButton({
  onClick,
  busy,
  disabled,
  label,
  busyLabel,
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      title={disabled ? "Configure AI_GATEWAY_API_KEY to enable agents" : undefined}
      className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      style={{ background: "var(--grad-brand)", boxShadow: "var(--shadow-glow)" }}
    >
      {busy ? (
        <>
          <svg className="animate-spin-slow h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {busyLabel}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export function TickerPicker({
  value,
  onChange,
  options,
  label = "Company",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ ticker: string; name: string }>;
  label?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-brand-400"
      >
        {options.map((o) => (
          <option key={o.ticker} value={o.ticker}>
            {o.ticker} — {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SelectPicker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-brand-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed"
      style={{
        background: "var(--div-extreme-soft)",
        border: "1px solid color-mix(in oklab, var(--div-extreme) 22%, transparent)",
        color: "var(--div-extreme)",
      }}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const color = {
    neutral: "var(--text)",
    good: "var(--div-aligned)",
    bad: "var(--div-extreme)",
    warn: "var(--warn)",
  }[tone];

  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-subtle">{label}</div>
      <div
        className="tnum mt-0.5 font-display text-[20px] font-bold leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

export function ConfidencePill({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: "var(--div-aligned)",
    medium: "var(--warn)",
    low: "var(--div-extreme)",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide",
      )}
      style={{
        background: `color-mix(in oklab, ${map[level] ?? "var(--text-subtle)"} 14%, transparent)`,
        color: map[level] ?? "var(--text-subtle)",
      }}
    >
      {level} confidence
    </span>
  );
}
