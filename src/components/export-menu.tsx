"use client";

import { useEffect, useRef, useState } from "react";
import { EXPORT_ITEMS } from "@/lib/export";

/**
 * Global export control.
 *
 * PDF goes through window.print() against the @media print stylesheet — no
 * dependency, and it renders exactly what is on screen. Data exports hit the
 * /api/export route so the serialisers and the full dataset stay server-side.
 */
export function ExportMenu({ ticker }: { ticker?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function download(id: string) {
    setBusy(id);
    const url = `/api/export?dataset=${id}${ticker ? `&ticker=${ticker}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      setBusy(null);
      setOpen(false);
    }, 600);
  }

  const scoped = Boolean(ticker);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold text-white transition-all active:scale-[0.98]"
        style={{ background: "var(--grad-brand)", boxShadow: "var(--shadow-glow)" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path
            d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-[330px] overflow-hidden rounded-2xl bg-surface"
          style={{ boxShadow: "var(--shadow-float)", border: "1px solid var(--border)" }}
        >
          <div className="border-b border-line px-4 py-3">
            <div className="font-display text-[13px] font-bold">Export</div>
            <p className="mt-0.5 text-[11px] text-muted">
              {scoped
                ? `Company-scoped files cover ${ticker}. Universe files cover all 30.`
                : "Every file carries provenance and the divergence formula in its header."}
            </p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.setTimeout(() => window.print(), 120);
            }}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
          >
            <Badge label="PDF" tone="brand" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">
                This page as PDF
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                Opens your print dialog — choose &ldquo;Save as PDF&rdquo;
              </span>
            </span>
          </button>

          <div className="border-t border-line px-4 pb-1.5 pt-2.5">
            <span className="eyebrow">Data files</span>
          </div>

          {EXPORT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={busy === item.id}
              onClick={() => download(item.id)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <Badge
                label={item.format.toUpperCase()}
                tone={item.format === "json" ? "violet" : "neutral"}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                  {item.description}
                </span>
              </span>
              {busy === item.id && (
                <svg
                  className="animate-spin-slow mt-1 h-3.5 w-3.5 shrink-0 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "brand" | "violet" | "neutral";
}) {
  const styles = {
    brand: { background: "var(--brand-100)", color: "var(--brand-800)" },
    violet: { background: "rgb(124 58 237 / 0.12)", color: "#7c3aed" },
    neutral: { background: "var(--surface-3)", color: "var(--text-muted)" },
  }[tone];

  return (
    <span
      className="mono mt-0.5 shrink-0 rounded-md px-1.5 py-1 text-[9px] font-bold tracking-wide"
      style={styles}
    >
      {label}
    </span>
  );
}
