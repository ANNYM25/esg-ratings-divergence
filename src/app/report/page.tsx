import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, BandBadge } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { DownloadButton } from "@/components/download-button";
import { PrintButton } from "@/components/print-button";
import { SECTORS } from "@/data/companies";
import {
  universe,
  universeStats,
  sectorDivergence,
  correlationMatrix,
  PROFILES,
} from "@/lib/divergence";
import { explain, CATEGORY_LABELS, LITERATURE_ATTRIBUTION } from "@/lib/explain";
import { PROVIDERS, PROVIDER_IDS, label } from "@/lib/providers";
import { VALIDATION } from "@/lib/validate";
import { PROVIDER_COLOR, rampColor } from "@/lib/ui";

export const metadata = { title: "Full report" };

/**
 * Print-optimised analyst report.
 *
 * The Export → PDF action calls window.print(); the @media print block in
 * globals.css strips the chrome, flattens the glass and forces colour so the
 * charts survive. No PDF library involved.
 */
export default function ReportPage() {
  const stats = universeStats();
  const rows = universe();
  const sectors = sectorDivergence();
  const matrix = correlationMatrix();
  const unverified = VALIDATION.total - VALIDATION.verified;

  const spotlight = rows.slice(0, 3).map((r) => ({
    row: r,
    explanation: explain(r.ticker),
  }));

  const generated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Shell
      title="Full analysis report"
      subtitle="A print-ready summary of the whole universe. Use Export → PDF, or your browser's print dialog, and choose Save as PDF."
      actions={<PrintButton />}
    >
      {/* ---------- Cover ---------- */}
      <div
        className="print-cover print-avoid-break relative mb-5 overflow-hidden rounded-2xl p-8 text-white sm:p-10"
        style={{ background: "var(--grad-hero)" }}
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative z-10">
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            ESG Divergence Analyser · Universe Report
          </div>
          <h2 className="mt-3 max-w-2xl font-display text-[32px] font-bold leading-tight sm:text-[40px]">
            Four raters disagree about {stats.materialShare}% of this universe
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/65">
            {stats.companies} companies across five sectors, rated by MSCI,
            Morningstar Sustainalytics, LSEG and S&amp;P Global. Mean divergence{" "}
            {stats.meanDivergence.toFixed(1)} of 100.
          </p>

          <div className="mt-7 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Companies", v: stats.companies },
              { k: "Providers", v: stats.providers },
              { k: "Mean gap", v: stats.meanDivergence.toFixed(1) },
              { k: "Widest", v: stats.maxDivergence.toFixed(1) },
            ].map((s) => (
              <div key={s.k}>
                <div className="text-[10px] uppercase tracking-wider text-white/45">
                  {s.k}
                </div>
                <div className="tnum mt-1 font-display text-[26px] font-bold leading-none">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <p className="mono mt-7 text-[10.5px] text-white/40">
            Generated {generated} · Research and education tool · Not investment
            advice
          </p>
        </div>
      </div>

      <ProvenanceBanner />

      {/* ---------- Method note ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="How to read this report"
          action={<DownloadButton dataset="full" label="JSON" />}
        />
        <div className="grid gap-4 text-[12.5px] leading-relaxed text-muted sm:grid-cols-3">
          <div>
            <h3 className="mb-1 font-display text-[12.5px] font-bold text-ink">
              The common scale
            </h3>
            Every provider is mapped to 0–100 where higher is better.
            Sustainalytics is inverted, because its raw figure is unmanaged risk.
            MSCI values carry an uncertainty band equal to the width of their
            letter bucket.
          </div>
          <div>
            <h3 className="mb-1 font-display text-[12.5px] font-bold text-ink">
              The divergence score
            </h3>
            <span className="mono text-[11.5px]">
              max(levelSpread, rankSpread)
            </span>
            . The larger of the two, so agreement on one dimension cannot cancel
            out disagreement on the other. This composite is this tool&rsquo;s
            own construction, not a published measure.
          </div>
          <div>
            <h3 className="mb-1 font-display text-[12.5px] font-bold text-ink">
              The reasons
            </h3>
            Produced deterministically by diffing provider methodologies, then
            attributed to scope, measurement or weight following Berg, Kölbel
            &amp; Rigobon (2022), <em>Aggregate Confusion: The Divergence of ESG
            Ratings</em>, Review of Finance 26(6), 1315&ndash;1344.
          </div>
        </div>
      </Card>

      {/* ---------- Spotlight cases ---------- */}
      <div className="print-break-after mt-5 space-y-5">
        {spotlight.map(({ row, explanation }, i) => (
          <Card key={row.ticker}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="eyebrow">Case {i + 1}</div>
                <h2 className="mt-1 font-display text-[19px] font-bold tracking-tight">
                  <Link href={`/company/${row.ticker}`} className="hover:underline">
                    {row.name}
                  </Link>
                  <span className="mono ml-2 text-[12px] font-bold text-brand">
                    {row.ticker}
                  </span>
                </h2>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  {SECTORS[row.sector].name} ·{" "}
                  {PROFILES[row.divergence.profile].label}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className="tnum font-display text-[28px] font-bold leading-none"
                    style={{ color: rampColor(row.divergence.score) }}
                  >
                    {row.divergence.score.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-subtle">divergence</div>
                </div>
                <BandBadge band={row.divergence.band} />
              </div>
            </div>

            <p className="rounded-xl bg-surface-2 p-3.5 text-[13px] leading-relaxed">
              {explanation.summary}
            </p>

            <div className="mt-3.5 space-y-2">
              {explanation.drivers.slice(0, 3).map((d, n) => (
                <div key={d.id} className="flex gap-2.5">
                  <span className="tnum mt-0.5 shrink-0 font-display text-[11px] font-bold text-subtle">
                    {n + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[12.5px] font-semibold">{d.title}</span>
                    <span className="ml-1.5 text-[10.5px] text-subtle">
                      ({CATEGORY_LABELS[d.category].label.toLowerCase()})
                    </span>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                      {d.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-subtle">
              Attribution — measurement {explanation.attribution.measurement}%,
              scope {explanation.attribution.scope}%, weight{" "}
              {explanation.attribution.weight}%. Literature average:{" "}
              {LITERATURE_ATTRIBUTION.measurement}% / {LITERATURE_ATTRIBUTION.scope}%
              / {LITERATURE_ATTRIBUTION.weight}%.
            </p>
          </Card>
        ))}
      </div>

      {/* ---------- Full table ---------- */}
      <Card className="mt-5" padded={false}>
        <div className="p-5 pb-3">
          <CardHeader
            title={`Full universe — all ${rows.length} companies`}
            hint="Sorted by divergence score."
            action={<DownloadButton dataset="divergence" />}
          />
        </div>
        <div className="scroll-x">
          <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-y border-line bg-surface-2">
                {["Company", "Sector", "Consensus", "Level", "Rank", "Score", "Band"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-2.5 pr-3 ${i === 0 ? "pl-5 text-left" : i > 1 && i < 6 ? "text-right" : "text-left"}`}
                    >
                      <span className="eyebrow">{h}</span>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticker} className="border-b border-line last:border-0">
                  <td className="py-2 pl-5 pr-3">
                    <Link href={`/company/${row.ticker}`} className="hover:underline">
                      <span className="mono mr-2 text-[11px] font-bold text-brand">
                        {row.ticker}
                      </span>
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-[11.5px] text-muted">
                    {SECTORS[row.sector].short}
                  </td>
                  <td className="tnum py-2 pr-3 text-right">
                    {row.consensus.toFixed(1)}
                  </td>
                  <td className="tnum py-2 pr-3 text-right text-muted">
                    {row.divergence.normalisedRange.toFixed(1)}
                  </td>
                  <td className="tnum py-2 pr-3 text-right text-muted">
                    {row.divergence.percentileRange.toFixed(1)}
                  </td>
                  <td className="tnum py-2 pr-3 text-right">
                    <span
                      className="font-display font-bold"
                      style={{ color: rampColor(row.divergence.score) }}
                    >
                      {row.divergence.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 pr-5">
                    <BandBadge band={row.divergence.band} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------- Sector + correlation ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Divergence by sector" />
          <div className="space-y-3">
            {sectors.map((s) => (
              <div key={s.sector}>
                <div className="mb-1 flex items-baseline justify-between text-[12px]">
                  <span className="font-semibold">{SECTORS[s.sector].name}</span>
                  <span
                    className="tnum font-display font-bold"
                    style={{ color: rampColor(s.mean) }}
                  >
                    {s.mean.toFixed(1)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.mean}%`, background: rampColor(s.mean) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Rank correlation"
            hint="Spearman, across the universe."
            action={<DownloadButton dataset="correlation" />}
          />
          <div className="scroll-x">
            <table className="w-full min-w-[380px] border-collapse text-[12px]">
              <thead>
                <tr>
                  <th />
                  {PROVIDER_IDS.map((p) => (
                    <th key={p} className="pb-2 pr-2 text-left">
                      <span
                        className="font-display text-[11px] font-bold"
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
                    <td className="py-1 pr-2">
                      <span
                        className="font-display text-[11px] font-bold"
                        style={{ color: PROVIDER_COLOR[a] }}
                      >
                        {PROVIDERS[a].shortName}
                      </span>
                    </td>
                    {PROVIDER_IDS.map((b) => (
                      <td key={b} className="py-1 pr-2">
                        <div
                          className="tnum flex h-8 items-center justify-center rounded-lg text-[11.5px] font-bold"
                          style={{
                            background:
                              a === b
                                ? "var(--surface-3)"
                                : `color-mix(in oklab, var(--brand-600) ${Math.round(Math.abs(matrix[`${a}:${b}`]) * 58)}%, var(--surface-2))`,
                            color:
                              a === b
                                ? "var(--text-subtle)"
                                : Math.abs(matrix[`${a}:${b}`]) > 0.62
                                  ? "#fff"
                                  : "var(--text)",
                          }}
                        >
                          {a === b ? "—" : matrix[`${a}:${b}`].toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---------- Provider appendix ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Appendix — provider methodologies"
          hint="The knowledge base every explanation in this report is derived from."
          action={<DownloadButton dataset="methodology" />}
        />
        <div className="scroll-x">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-2 pr-3 text-left">
                  <span className="eyebrow">Attribute</span>
                </th>
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
              {(
                [
                  ["Scale", (id: (typeof PROVIDER_IDS)[number]) => PROVIDERS[id].scale.unit],
                  ["Direction", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].scale.direction)],
                  ["Measures", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].framing)],
                  ["Benchmark", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].benchmark)],
                  ["Materiality", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].materiality)],
                  ["Non-disclosure", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].disclosure)],
                  ["Controversies", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].controversy)],
                  ["Cadence", (id: (typeof PROVIDER_IDS)[number]) => label(PROVIDERS[id].cadence)],
                  ["Reported inputs", (id: (typeof PROVIDER_IDS)[number]) => `${PROVIDERS[id].dataMix.selfReported}%`],
                ] as const
              ).map(([name, get]) => (
                <tr key={name} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-semibold">{name}</td>
                  {PROVIDER_IDS.map((p) => (
                    <td key={p} className="py-2 pr-3 text-muted">
                      {get(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------- Closing note ---------- */}
      <Card className="mt-5">
        <CardHeader title="Limitations" />
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted">
          {[
            unverified > 0
              ? `${unverified} of ${VALIDATION.total} rating records in this build are illustrative placeholders, not published provider ratings.`
              : "All rating records have been verified against provider sources.",
            "Normalisation across incommensurable scales is inherently lossy — a single 0–100 number cannot fully reconcile a risk metric with a performance metric.",
            "Percentiles are computed within this 30-company universe. With six companies per sector the finest percentile step is 16.7 points, so the rank component moves in visible jumps.",
            "The engine identifies which methodology differences are capable of producing a gap; without indicator-level data it cannot prove causation.",
            "Provider methodologies change. The encoded profiles are a snapshot and need periodic review.",
          ].map((text) => (
            <li key={text} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[12px] font-semibold">
          Research and education tool. Nothing in this report is investment advice.
        </p>
      </Card>
    </Shell>
  );
}
