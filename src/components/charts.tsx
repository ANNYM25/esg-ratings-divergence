/**
 * Hand-rolled SVG charts.
 *
 * No charting library. These are simple enough that a dependency would cost
 * more than it saves, and hand-rolling keeps full control over the uncertainty
 * bands — the one thing off-the-shelf chart components will not render, and
 * the detail that stops a letter grade from being read as a point estimate.
 *
 * Visual language follows the reference dashboard: fully rounded bar caps,
 * gradient fills, hatched "inactive" states.
 */

import { PROVIDERS } from "@/lib/providers";
import { BAND_COLOR, PROVIDER_COLOR } from "@/lib/ui";
import type { DivergenceBand, NormalisedRating, Pillar, ProviderId } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Divergence gauge
 * ------------------------------------------------------------------ */

export function DivergenceGauge({
  score,
  band,
  size = 210,
}: {
  score: number;
  band: DivergenceBand;
  size?: number;
}) {
  const stroke = 18;
  const r = (size - stroke) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2 + 8;

  const START = 150;
  const SWEEP = 240;

  const polar = (deg: number, radius: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };

  const arc = (from: number, to: number, radius: number) => {
    const s = polar(from, radius);
    const e = polar(to, radius);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = BAND_COLOR[band].fg;
  const gid = `gauge-${band}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.8}
        viewBox={`0 0 ${size} ${size * 0.8}`}
        role="img"
        aria-label={`Divergence score ${score.toFixed(1)} out of 100, ${BAND_COLOR[band].label}`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.72" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--surface-3)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(20 35 27 / 0.10)" strokeWidth="3" />
          </pattern>
        </defs>

        <path
          d={arc(START, START + SWEEP, r)}
          fill="none"
          stroke="url(#hatch)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={arc(START, START + SWEEP * Math.max(pct, 0.006), r)}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="tnum"
          style={{
            fill: "var(--text)",
            fontSize: size * 0.23,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.03em",
          }}
        >
          {score.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          style={{ fill: "var(--text-subtle)", fontSize: 11, fontWeight: 500 }}
        >
          / 100
        </text>
      </svg>

      <div
        className="-mt-1 rounded-full px-3.5 py-1.5 font-display text-[12px] font-bold"
        style={{ background: BAND_COLOR[band].soft, color }}
      >
        {BAND_COLOR[band].label} divergence
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Normalised comparison bars, with uncertainty bands
 * ------------------------------------------------------------------ */

export function NormalisedBars({
  ratings,
  median,
  mode = "normalised",
}: {
  ratings: NormalisedRating[];
  median?: number | null;
  mode?: "normalised" | "percentile";
}) {
  return (
    <div className="space-y-4">
      {ratings.map((r) => {
        const value = mode === "percentile" ? r.sectorPercentile : r.normalised;
        const color = PROVIDER_COLOR[r.provider];
        const showBand = mode === "normalised";
        const bandWidth = r.band.high - r.band.low;

        return (
          <div key={r.provider}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                {PROVIDERS[r.provider].shortName}
              </span>
              <span className="tnum font-display text-[13px] font-bold" style={{ color }}>
                {value.toFixed(1)}
                {mode === "percentile" && (
                  <span className="ml-0.5 text-[10px] font-medium text-subtle">pctl</span>
                )}
              </span>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-3">
              {/* Uncertainty band — the width of the provider's own bucket. */}
              {showBand && bandWidth > 1 && (
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${r.band.low}%`,
                    width: `${bandWidth}%`,
                    background: color,
                    opacity: 0.2,
                  }}
                  title={`Bucket spans ${r.band.low.toFixed(1)}–${r.band.high.toFixed(1)} on the common scale`}
                />
              )}
              <div
                className="absolute top-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(value, 1.5)}%`,
                  background: `linear-gradient(90deg, ${color}b3, ${color})`,
                }}
              />
              {typeof median === "number" && mode === "normalised" && (
                <div
                  className="absolute -top-0.5 h-4 w-[1.5px] rounded-full"
                  style={{ left: `${median}%`, background: "var(--text-subtle)" }}
                />
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-subtle">
              <span className="mono">{r.rawLabel}</span>
              {showBand && bandWidth > 1 && (
                <span className="tnum">±{(bandWidth / 2).toFixed(1)} bucket width</span>
              )}
            </div>
          </div>
        );
      })}

      {typeof median === "number" && mode === "normalised" && (
        <div className="flex items-center gap-1.5 pt-0.5 text-[10.5px] text-subtle">
          <span className="inline-block h-3 w-[1.5px] rounded-full bg-current" />
          Sector median, all providers ({median.toFixed(1)})
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Vertical rounded bars — the reference dashboard's signature chart
 * ------------------------------------------------------------------ */

export function RoundedBarChart({
  data,
  height = 170,
  highlightIndex,
}: {
  data: Array<{ label: string; value: number; sublabel?: string }>;
  height?: number;
  highlightIndex?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak =
    highlightIndex ?? data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * (height - 26), 8);
          const active = i === peak;
          return (
            <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
              {active && (
                <span
                  className="tnum rounded-md px-1.5 py-0.5 text-[9.5px] font-bold text-white"
                  style={{ background: "var(--brand-700)" }}
                >
                  {d.value.toFixed(0)}
                </span>
              )}
              <div
                className="w-full max-w-[38px] rounded-full transition-all duration-300"
                style={{
                  height: h,
                  background: active
                    ? "var(--grad-hero)"
                    : "linear-gradient(180deg, var(--brand-300), var(--brand-400))",
                  opacity: active ? 1 : 0.55,
                }}
                title={`${d.sublabel ?? d.label}: ${d.value.toFixed(1)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex justify-between gap-2">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 truncate text-center text-[10.5px] font-medium text-subtle"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pillar radar
 * ------------------------------------------------------------------ */

const PILLAR_LABELS: Record<Pillar, string> = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
};

export function PillarRadar({
  ratings,
  size = 270,
}: {
  ratings: NormalisedRating[];
  size?: number;
}) {
  const withPillars = ratings.filter((r) => r.pillars);
  if (withPillars.length === 0) return null;

  const axes: Pillar[] = ["environmental", "social", "governance"];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 44;

  const point = (axisIndex: number, value: number) => {
    const angle = (Math.PI * 2 * axisIndex) / axes.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Pillar scores by provider on the common 0–100 scale"
        className="max-w-[290px]"
      >
        {[25, 50, 75, 100].map((ring) => (
          <polygon
            key={ring}
            points={axes.map((_, i) => {
              const p = point(i, ring);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill={ring === 100 ? "var(--surface-2)" : "none"}
            stroke="var(--border-strong)"
            strokeWidth={1}
            strokeDasharray={ring === 100 ? undefined : "3 3"}
          />
        ))}

        {axes.map((_, i) => {
          const p = point(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
          );
        })}

        {withPillars.map((r) => {
          const color = PROVIDER_COLOR[r.provider];
          const pts = axes.map((axis, i) => {
            const p = point(i, r.pillars![axis]);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <g key={r.provider}>
              <polygon points={pts} fill={color} fillOpacity={0.11} stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
              {axes.map((axis, i) => {
                const p = point(i, r.pillars![axis]);
                return (
                  <circle key={axis} cx={p.x} cy={p.y} r={3.4} fill={color} stroke="#fff" strokeWidth={1.5} />
                );
              })}
            </g>
          );
        })}

        {axes.map((axis, i) => {
          const p = point(i, 126);
          return (
            <text
              key={axis}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fill: "var(--text-muted)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-display)",
              }}
            >
              {PILLAR_LABELS[axis]}
            </text>
          );
        })}
      </svg>

      <Legend providers={withPillars.map((r) => r.provider)} />
    </div>
  );
}

export function Legend({ providers }: { providers: ProviderId[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {providers.map((p) => (
        <span key={p} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: PROVIDER_COLOR[p] }}
          />
          {PROVIDERS[p].shortName}
        </span>
      ))}
    </div>
  );
}
