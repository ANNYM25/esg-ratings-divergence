"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 font-display text-[13px] font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M7 9V4h10v5M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="7" y="15" width="10" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.9" />
      </svg>
      Print / PDF
    </button>
  );
}
