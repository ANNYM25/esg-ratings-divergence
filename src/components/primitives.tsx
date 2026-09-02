import { BAND_COLOR, cn } from "@/lib/ui";
import type { DivergenceBand } from "@/lib/types";

export function Card({
  children,
  className,
  padded = true,
  id,
  glass = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
  glass?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "print-avoid-break scroll-mt-24 rounded-2xl",
        glass ? "glass" : "border border-line bg-surface shadow-card",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[15.5px] font-bold tracking-tight">{title}</h2>
        {hint && (
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{hint}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function BandBadge({
  band,
  score,
  size = "md",
}: {
  band: DivergenceBand;
  score?: number;
  size?: "sm" | "md";
}) {
  const c = BAND_COLOR[band];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-display font-bold",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]",
      )}
      style={{ background: c.soft, color: c.fg }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {c.label}
      {score !== undefined && <span className="tnum opacity-70">{score.toFixed(0)}</span>}
    </span>
  );
}

/**
 * KPI tile. The `featured` variant carries the dark gradient treatment from
 * the reference dashboard — exactly one tile per row should use it, or the
 * emphasis stops meaning anything.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  featured = false,
  accent,
  delta,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  featured?: boolean;
  accent?: string;
  delta?: string;
}) {
  return (
    <div
      className={cn(
        "print-avoid-break relative overflow-hidden rounded-2xl p-4.5",
        featured ? "text-white" : "glass",
      )}
      style={
        featured
          ? { background: "var(--grad-hero)", padding: "18px", boxShadow: "var(--shadow-glow)" }
          : { padding: "18px" }
      }
    >
      {featured && (
        <>
          <span
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(141,211,174,0.30) 0%, transparent 70%)",
            }}
          />
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </>
      )}

      <div className="relative z-10">
        <div
          className={cn(
            "text-[11.5px] font-semibold",
            featured ? "text-white/70" : "text-muted",
          )}
        >
          {label}
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span
            className="tnum font-display text-[32px] font-bold leading-none tracking-tight"
            style={accent && !featured ? { color: accent } : undefined}
          >
            {value}
          </span>
          {unit && (
            <span
              className={cn(
                "text-[13px] font-semibold",
                featured ? "text-white/60" : "text-subtle",
              )}
            >
              {unit}
            </span>
          )}
        </div>

        {delta && (
          <div
            className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            style={
              featured
                ? { background: "rgba(255,255,255,0.16)", color: "#fff" }
                : { background: "var(--brand-50)", color: "var(--brand-700)" }
            }
          >
            {delta}
          </div>
        )}

        {hint && (
          <div
            className={cn(
              "mt-2.5 text-[11px] leading-relaxed",
              featured ? "text-white/55" : "text-subtle",
            )}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-subtle">
      {message}
    </div>
  );
}

export function Pill({
  children,
  color,
  soft,
}: {
  children: React.ReactNode;
  color: string;
  soft: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: soft, color }}
    >
      {children}
    </span>
  );
}
