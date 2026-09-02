"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/research", label: "Research findings", icon: FlaskIcon },
  { href: "/screening", label: "Screening impact", icon: FilterIcon },
  { href: "/sectors", label: "Sectors", icon: LayersIcon },
  { href: "/compare", label: "Compare", icon: ColumnsIcon },
  { href: "/providers", label: "Providers", icon: ScaleIcon },
  { href: "/agents", label: "Agents", icon: AgentIcon },
  { href: "/report", label: "Report", icon: FileIcon },
];

const GENERAL = [{ href: "/methodology", label: "Methodology", icon: BookIcon }];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      // Sticky + self-start so the nav stays in view on long pages. This only
      // works because the shell uses `overflow-clip` rather than
      // `overflow-hidden` — clip still rounds the corners but does not create
      // a scroll container, so sticky continues to resolve against the viewport.
      className="no-print relative hidden w-[248px] shrink-0 flex-col overflow-hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:self-start"
      style={{ background: "var(--grad-sidebar)" }}
    >
      {/* Dot-grid edge strip */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-[380px] w-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(92,187,138,0.20) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 ml-3 flex h-full min-h-0 flex-col px-3.5 py-5">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-1.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "var(--brand-400)",
              boxShadow: "0 0 18px rgba(92,187,138,0.4)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden>
              <path
                d="M6 17V9M12 17V5M18 17v-4"
                stroke="#0a2e1d"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="leading-none">
            <span className="block font-display text-[16px] font-bold tracking-tight text-white">
              Divergence
            </span>
            <span className="mono mt-1 block text-[9px] uppercase tracking-[0.14em] text-white/40">
              ESG Ratings Analyser
            </span>
          </span>
        </Link>

        <NavGroup label="Menu" items={NAV} pathname={pathname} />
        <div className="mt-7">
          <NavGroup label="General" items={GENERAL} pathname={pathname} />
        </div>

        {/* Reference card */}
        <div
          className="mt-auto overflow-hidden rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
        >
          <div className="mono text-[9px] uppercase tracking-[0.14em] text-white/40">
            Framework
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/65">
            Scope / measurement / weight decomposition after Berg, Kölbel &amp;
            Rigobon (2022), <em>Aggregate Confusion</em>, Review of Finance 26(6).
          </p>
          <Link
            href="/methodology#literature"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--brand-300)" }}
          >
            Read the approach
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden>
              <path
                d="M5 12h13m0 0-5-5m5 5-5 5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof NAV;
  pathname: string;
}) {
  return (
    <div>
      <div className="mb-2 px-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/35">
        {label}
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label: text, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-all duration-150",
                active ? "text-white" : "text-white/55 hover:bg-white/[0.07] hover:text-white",
              )}
              style={
                active
                  ? {
                      background: "rgba(92,187,138,0.16)",
                      boxShadow: "inset 3px 0 0 var(--brand-300)",
                    }
                  : undefined
              }
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                style={{
                  background: active
                    ? "rgba(141,211,174,0.22)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <Icon
                  className="h-[15px] w-[15px]"
                  color={active ? "var(--brand-300)" : "rgba(255,255,255,0.5)"}
                />
              </span>
              <span className="font-display text-[13.5px] font-semibold">{text}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* ---- icons ---- */
type IconProps = { className?: string; color?: string };

function GridIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" fill={color} />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" stroke={color} strokeWidth="1.9" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" stroke={color} strokeWidth="1.9" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" stroke={color} strokeWidth="1.9" />
    </svg>
  );
}

function LayersIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="m3 13 9 5 9-5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ColumnsIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="4" width="7" height="16" rx="2.2" stroke={color} strokeWidth="1.9" />
      <rect x="14" y="4" width="7" height="16" rx="2.2" stroke={color} strokeWidth="1.9" />
    </svg>
  );
}

function ScaleIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 4v16M5 8h14" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 8 2.5 14h5L5 8ZM19 8l-2.5 6h5L19 8Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M13 3v5h5" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

function FlaskIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M10 3v6.2L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.2V3"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M9 3h6M7.6 14h8.8" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgentIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="12" rx="3" stroke={color} strokeWidth="1.9" />
      <path d="M12 4v3" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.4" fill={color} />
      <circle cx="9" cy="12.5" r="1.3" fill={color} />
      <circle cx="15" cy="12.5" r="1.3" fill={color} />
      <path d="M9.5 16h5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className, color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M8 4v16" stroke={color} strokeWidth="1.9" />
    </svg>
  );
}
