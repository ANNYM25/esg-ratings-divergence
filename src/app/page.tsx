import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, StatCard, BandBadge } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { ExecutiveSummary } from "@/components/executive-summary";
import { RoundedBarChart } from "@/components/charts";
import { DownloadButton } from "@/components/download-button";
import { SECTORS } from "@/data/companies";
import {
  universe,
  universeStats,
  sectorDivergence,
  correlationMatrix,
  BANDS,
  PROFILES,
} from "@/lib/divergence";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/providers";
import { PROVIDER_COLOR, rampColor } from "@/lib/ui";
import type { DivergenceBand } from "@/lib/types";

export default function DashboardPage() {
  const stats = universeStats();
  const rows = universe();
  const sectors = sectorDivergence();
  const matrix = correlationMatrix();

  return (
    <Shell
      title="Divergence Dashboard"
      subtitle="Where the major ESG raters disagree, by how much, and which methodology differences are responsible."
    >
      {/* Findings before methodology — the reader gets ninety seconds. */}
      <ExecutiveSummary />

      <div className="mt-5">
        <ProvenanceBanner />
      </div>

      {/* ---------- KPI row ---------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mean divergence score"
          value={stats.meanDivergence.toFixed(1)}
          unit="/ 100"
          delta={`${stats.companies} companies · ${stats.providers} providers`}
          hint="Average gap between the highest and lowest rater across the universe"
        />
        <StatCard
          label="Material disagreement"
          value={`${stats.materialShare}%`}
          accent="var(--div-significant)"
          hint="Share scoring Significant or Extreme — where which rating you use changes the conclusion"
        />
        <StatCard
          label="Widest divergence"
          value={stats.maxDivergence.toFixed(1)}
          unit={stats.mostDivergent.ticker}
          accent="var(--div-extreme)"
          hint={stats.mostDivergent.name}
        />
        <StatCard
          label="Broadly aligned"
          value={stats.counts.aligned}
          unit={`of ${stats.companies}`}
          accent="var(--div-aligned)"
          hint="Companies where all four providers concur on level and rank"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        {/* ---------- Leaderboard ---------- */}
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Most divergent companies"
              hint="Ranked by composite divergence score. Click through for the methodology-level explanation."
              action={<DownloadButton dataset="divergence" />}
            />
          </div>

          <div className="scroll-x">
            <table className="w-full min-w-[680px] border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface-2">
                  <Th className="pl-5">Company</Th>
                  <Th>Sector</Th>
                  <Th>Disagreement</Th>
                  <Th align="right">Consensus</Th>
                  <Th align="right">Score</Th>
                  <Th className="pr-5">Band</Th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((row) => (
                  <tr
                    key={row.ticker}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-2.5 pl-5 pr-3">
                      <Link href={`/company/${row.ticker}`} className="group block">
                        <span className="mono mr-2 text-[11.5px] font-bold text-brand">
                          {row.ticker}
                        </span>
                        <span className="text-[12.5px] group-hover:underline">
                          {row.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-[11.5px] text-muted">
                      {SECTORS[row.sector].short}
                    </td>
                    <td className="py-2.5 pr-3 text-[11px] text-muted">
                      {PROFILES[row.divergence.profile].label}
                    </td>
                    <td className="tnum py-2.5 pr-3 text-right text-[12.5px]">
                      {row.consensus.toFixed(1)}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span
                        className="tnum font-display text-[14px] font-bold"
                        style={{ color: rampColor(row.divergence.score) }}
                      >
                        {row.divergence.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-5">
                      <BandBadge band={row.divergence.band} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-line px-5 py-3">
            <Link
              href="/sectors"
              className="text-[12px] font-semibold text-brand underline underline-offset-2"
            >
              See all {rows.length} companies by sector →
            </Link>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          {/* ---------- Sector bars ---------- */}
          <Card>
            <CardHeader
              title="Divergence by sector"
              hint="Mean composite score. Sectors where the product itself is contested diverge most."
            />
            <RoundedBarChart
              data={sectors.map((s) => ({
                label: SECTORS[s.sector].short.slice(0, 4),
                sublabel: SECTORS[s.sector].name,
                value: s.mean,
              }))}
            />
          </Card>

          {/* ---------- Band distribution ---------- */}
          <Card>
            <CardHeader
              title="Distribution of agreement"
              hint="How the universe splits across the four bands."
            />
            <BandDistribution counts={stats.counts} total={stats.companies} />
          </Card>
        </div>
      </div>

      {/* ---------- Correlation ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Rank correlation between providers"
          hint="Spearman correlation of normalised scores across the whole universe. The literature reports roughly 0.38–0.71 between major raters; anything approaching 1.0 would mean the raters were redundant."
          action={<DownloadButton dataset="correlation" />}
        />
        <CorrelationMatrix matrix={matrix} />
      </Card>
    </Shell>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th className={`py-2.5 pr-3 text-${align} ${className}`}>
      <span className="eyebrow">{children}</span>
    </th>
  );
}

const BAND_SAMPLE: Record<DivergenceBand, number> = {
  aligned: 5,
  mild: 25,
  significant: 45,
  extreme: 80,
};

function BandDistribution({
  counts,
  total,
}: {
  counts: Record<DivergenceBand, number>;
  total: number;
}) {
  const order: DivergenceBand[] = ["aligned", "mild", "significant", "extreme"];

  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-surface-3">
        {order.map((band) => {
          const pct = (counts[band] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={band}
              className="first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, background: rampColor(BAND_SAMPLE[band]) }}
              title={`${BANDS[band].label}: ${counts[band]}`}
            />
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {order.map((band) => (
          <div key={band} className="flex items-start gap-2.5">
            <span
              className="mt-[5px] inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: rampColor(BAND_SAMPLE[band]) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold">
                  {BANDS[band].label}
                  <span className="tnum ml-1.5 text-[10.5px] font-normal text-subtle">
                    {BANDS[band].min}–{BANDS[band].max}
                  </span>
                </span>
                <span className="tnum font-display text-[13px] font-bold">
                  {counts[band]}
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] leading-snug text-subtle">
                {BANDS[band].description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationMatrix({ matrix }: { matrix: Record<string, number> }) {
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[480px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="pb-2 pr-3" />
            {PROVIDER_IDS.map((p) => (
              <th key={p} className="pb-2 pr-3 text-left">
                <span
                  className="font-display text-[11.5px] font-bold"
                  style={{ color: PROVIDER_COLOR[p] }}
                >
                  {PROVIDERS[p].shortName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROVIDER_IDS.map((a) => (
            <tr key={a}>
              <td className="py-1 pr-3">
                <span
                  className="font-display text-[11.5px] font-bold"
                  style={{ color: PROVIDER_COLOR[a] }}
                >
                  {PROVIDERS[a].shortName}
                </span>
              </td>
              {PROVIDER_IDS.map((b) => {
                const v = matrix[`${a}:${b}`] ?? 0;
                const self = a === b;
                return (
                  <td key={b} className="py-1 pr-3">
                    <div
                      className="tnum flex h-10 items-center justify-center rounded-xl font-display text-[13px] font-bold"
                      style={{
                        background: self
                          ? "var(--surface-3)"
                          : `color-mix(in oklab, var(--brand-600) ${Math.round(Math.abs(v) * 58)}%, var(--surface-2))`,
                        color: self
                          ? "var(--text-subtle)"
                          : Math.abs(v) > 0.62
                            ? "#fff"
                            : "var(--text)",
                      }}
                    >
                      {self ? "—" : v.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
