"use client";

/**
 * Per-card download control.
 *
 * Sits in a card header so each individual dataset can be pulled on its own,
 * rather than forcing everything through the global export menu.
 */
export function DownloadButton({
  dataset,
  ticker,
  label = "CSV",
  title,
}: {
  dataset: string;
  ticker?: string;
  label?: string;
  title?: string;
}) {
  const href = `/api/export?dataset=${dataset}${ticker ? `&ticker=${ticker}` : ""}`;

  return (
    <a
      href={href}
      download
      title={title ?? `Download this dataset as ${label}`}
      className="no-print flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path
          d="M12 3v11m0 0-4-4m4 4 4-4M4.5 17.5v2A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </a>
  );
}
