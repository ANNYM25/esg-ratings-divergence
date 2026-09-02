import Link from "next/link";
import { Sidebar } from "./sidebar";
import { SearchBar } from "./search";
import { ExportMenu } from "./export-menu";
import { UserMenu } from "./user-menu";
import { VALIDATION } from "@/lib/validate";

/**
 * Three levels of nesting, following the reference dashboard:
 *
 *   backdrop (soft grey, carries the colour blooms)
 *     └─ shell   (large rounded panel, floats on the backdrop)
 *          └─ cards (glass, rounded, inside the shell)
 *
 * Each level has its own radius and elevation. That is what produces the
 * depth — a single flat page with cards on it does not read the same way.
 */
export function Shell({
  children,
  title,
  subtitle,
  actions,
  exportTicker,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Scopes the export menu's per-company downloads. */
  exportTicker?: string;
}) {
  // Deliberately does NOT read cookies() here. Doing so would opt every page
  // out of static generation, and the only thing the session provides is a
  // display name. UserMenu reads it in the browser instead, which keeps all
  // 30 company pages prerendered.
  const unverified = VALIDATION.total - VALIDATION.verified;

  return (
    <div className="backdrop-blooms relative min-h-screen p-0 lg:p-4">
      <div
        className="app-shell relative z-10 flex min-h-screen overflow-clip bg-shell lg:min-h-[calc(100vh-2rem)] lg:rounded-[28px]"
        style={{ boxShadow: "var(--shadow-shell)" }}
      >
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ---------- Top bar ---------- */}
          {/* The header needs its own opaque band, not just a glass pill —
              otherwise page content scrolls visibly through the gaps around
              the pill. */}
          <header
            className="app-header sticky top-0 z-30 px-3 pb-3 pt-3 sm:px-4 sm:pt-4"
            style={{
              background:
                "linear-gradient(to bottom, var(--shell) 62%, color-mix(in oklab, var(--shell) 70%, transparent) 100%)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
              <SearchBar />
              <div className="ml-auto flex items-center gap-2">
                {unverified > 0 && (
                  <Link
                    href="/methodology#provenance"
                    className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 xl:flex"
                    style={{
                      background: "var(--warn-soft)",
                      border: "1px solid var(--warn-border)",
                      color: "var(--warn)",
                    }}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                    {unverified} unverified
                  </Link>
                )}
                <UserMenu />
              </div>
            </div>
          </header>

          {/* ---------- Page ---------- */}
          <main className="app-main min-w-0 flex-1 px-3 pb-5 pt-2 sm:px-4 sm:pb-6 lg:px-6">
            <div className="print-root mx-auto w-full max-w-[1440px]">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0 animate-fade-up">
                  <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className="no-print flex shrink-0 items-center gap-2">
                  {actions}
                  <ExportMenu ticker={exportTicker} />
                </div>
              </div>

              {children}
            </div>
          </main>

          {/* ---------- Footer ---------- */}
          <footer className="no-print border-t border-line px-4 py-4 text-[11.5px] text-subtle sm:px-6">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1.5">
              <span>ESG Divergence Analyser — research and education tool.</span>
              <span className="font-semibold text-muted">Not investment advice.</span>
              <Link
                href="/methodology"
                className="underline underline-offset-2 transition-colors hover:text-ink"
              >
                Methodology &amp; limitations
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
