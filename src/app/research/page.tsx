import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, StatCard } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { DownloadButton } from "@/components/download-button";
import { inferenceSummary, fmtInterval } from "@/lib/statistics";
import { predictorSummary, MIN_GROUP_N } from "@/lib/predictors";
import { turnoverAcrossScreens, COST_ASSUMPTIONS } from "@/lib/screening";
import { PROVIDERS } from "@/lib/providers";
import { rampColor } from "@/lib/ui";

export const metadata = { title: "Research findings" };

export default function ResearchPage() {
  const inf = inferenceSummary();
  const pred = predictorSummary();
  const turnover = turnoverAcrossScreens();
  const worstCost = turnover[0];
  const bestCost = turnover[turnover.length - 1];

  return (
    <Shell
      title="Research findings"
      subtitle="Quantified uncertainty, a null benchmark, and what predicts divergence. The difference between a dashboard and a result."
    >
      <ProvenanceBanner />

      {/* ---------- Headline result ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Is the disagreement real, or is it noise?"
          hint="The first question any reviewer asks, and the one a descriptive dashboard cannot answer."
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              Mean divergence is{" "}
              <span className="font-semibold text-ink">
                {fmtInterval(inf.meanDivergence)}
              </span>
              . On its own that number could mean anything, so it is tested
              against a permutation null: each rater&rsquo;s scores are shuffled
              independently across companies, destroying any shared signal while
              preserving each rater&rsquo;s own scoring distribution exactly.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              Four raters who share nothing would produce mean divergence of{" "}
              <span className="font-semibold text-ink">
                {inf.nullTest.nullMean}
              </span>{" "}
              (95% {inf.nullTest.nullLow}&ndash;{inf.nullTest.nullHigh}). The
              observed {inf.nullTest.observed} sits well below that, with{" "}
              <span className="font-semibold text-ink">
                p {inf.nullTest.pValue === 0 ? `< ${(1 / inf.nullTest.iterations).toFixed(3)}` : `= ${inf.nullTest.pValue}`}
              </span>{" "}
              over {inf.nullTest.iterations} permutations.
            </p>
            <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-3 text-[13px] font-medium leading-relaxed">
              The raters are measuring a shared underlying construct — this is
              not four random number generators. But the residual disagreement,
              after that shared signal is accounted for, is still large enough to
              change portfolios.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="eyebrow mb-3">Observed vs null</div>
            <NullChart
              observed={inf.nullTest.observed}
              nullMean={inf.nullTest.nullMean}
              nullLow={inf.nullTest.nullLow}
              nullHigh={inf.nullTest.nullHigh}
            />
            <p className="mt-3 text-[11px] leading-relaxed text-subtle">
              If the observed bar sat inside the null band, the raters would be
              indistinguishable from independent scorers and this whole tool
              would be measuring noise. It does not.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------- Intervals ---------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          featured
          label="Mean divergence"
          value={inf.meanDivergence.estimate}
          unit={`± ${inf.meanDivergence.margin}`}
          delta={`95% CI ${inf.meanDivergence.low}–${inf.meanDivergence.high}`}
          hint={`Non-parametric bootstrap, ${inf.meanDivergence.iterations.toLocaleString()} resamples, n=${inf.sampleSize}`}
        />
        <StatCard
          label="Level spread"
          value={inf.levelSpread.estimate}
          unit={`± ${inf.levelSpread.margin}`}
          hint={`95% CI ${inf.levelSpread.low}–${inf.levelSpread.high}`}
        />
        <StatCard
          label="Rank spread"
          value={inf.rankSpread.estimate}
          unit={`± ${inf.rankSpread.margin}`}
          hint={`95% CI ${inf.rankSpread.low}–${inf.rankSpread.high}`}
        />
        <StatCard
          label="Mean pairwise ρ"
          value={inf.correlationInterval.estimate.toFixed(2)}
          accent="var(--brand-700)"
          hint={`95% CI ${inf.correlationInterval.low}–${inf.correlationInterval.high}. Berg et al. report 0.38–0.71.`}
        />
      </div>

      {/* ---------- Predictors ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="What predicts divergence"
          hint="Four hypotheses stated before the numbers were computed, each tied to a specific methodology mechanism."
          action={<DownloadButton dataset="divergence" />}
        />

        <p className="mb-4 rounded-xl bg-surface-2 p-4 text-[13.5px] font-medium leading-relaxed">
          {pred.conclusion}
        </p>

        <div className="space-y-4">
          {pred.results.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[14.5px] font-bold">
                      {r.attribute}
                    </h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                      style={{
                        background: r.supported
                          ? "var(--div-aligned-soft)"
                          : "var(--div-extreme-soft)",
                        color: r.supported
                          ? "var(--div-aligned)"
                          : "var(--div-extreme)",
                      }}
                    >
                      {r.supported ? "hypothesis held" : "hypothesis rejected"}
                    </span>
                    {r.separated && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                        style={{
                          background: "var(--brand-100)",
                          color: "var(--brand-800)",
                        }}
                      >
                        intervals separate
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 max-w-3xl text-[12px] italic leading-relaxed text-subtle">
                    {r.hypothesis}
                  </p>
                </div>

                <div className="text-right">
                  <div className="tnum font-display text-[19px] font-bold leading-none">
                    d = {r.effectSize}
                  </div>
                  <div className="text-[10px] capitalize text-subtle">
                    {r.effectLabel} effect
                  </div>
                </div>
              </div>

              {/* Group means with intervals */}
              <div className="mt-3.5 space-y-2">
                {r.groups.map((g) => {
                  const width = Math.min(100, g.meanDivergence.estimate);
                  return (
                    <div key={g.label}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11.5px]">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium">{g.label}</span>
                          <span className="tnum text-subtle">n={g.n}</span>
                          {g.underpowered && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                              style={{
                                background: "var(--warn-soft)",
                                color: "var(--warn)",
                              }}
                              title={`Fewer than ${MIN_GROUP_N} companies — excluded from the effect size`}
                            >
                              underpowered
                            </span>
                          )}
                        </span>
                        <span className="tnum font-semibold">
                          {g.meanDivergence.estimate}{" "}
                          <span className="font-normal text-subtle">
                            ({g.meanDivergence.low}–{g.meanDivergence.high})
                          </span>
                        </span>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-surface-3">
                        {/* Confidence interval */}
                        <div
                          className="absolute top-0 h-full rounded-full opacity-25"
                          style={{
                            left: `${g.meanDivergence.low}%`,
                            width: `${Math.max(g.meanDivergence.high - g.meanDivergence.low, 1)}%`,
                            background: rampColor(g.meanDivergence.estimate),
                          }}
                        />
                        {/* Point estimate */}
                        <div
                          className="absolute top-1/2 h-3.5 w-[2.5px] -translate-y-1/2 rounded-full"
                          style={{
                            left: `${width}%`,
                            background: rampColor(g.meanDivergence.estimate),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 border-t border-line pt-2.5 text-[12.5px] leading-relaxed">
                <span className="font-semibold">Finding. </span>
                {r.finding}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                <span className="font-semibold text-ink">Mechanism. </span>
                {r.mechanism}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------- Cost ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="What it costs to switch vendor"
          hint="Turnover expressed the way a portfolio manager reads it, market-cap weighted."
          action={<DownloadButton dataset="screening" />}
        />

        <p className="text-[13.5px] leading-relaxed">
          Screen design changes the cost of vendor choice by a factor of{" "}
          <span className="font-semibold">
            {bestCost.costBpMid > 0
              ? Math.round(worstCost.costBpMid / bestCost.costBpMid)
              : "—"}
          </span>
          . A {worstCost.screen.name.toLowerCase()} mandate would turn over{" "}
          <span className="font-semibold">{worstCost.valueTurnover}% of value</span>{" "}
          switching from {PROVIDERS[worstCost.a].shortName} to{" "}
          {PROVIDERS[worstCost.b].shortName}, costing roughly{" "}
          <span className="font-semibold">{worstCost.costBpMid}bp</span> one-off.
          A {bestCost.screen.name.toLowerCase()} mandate costs{" "}
          <span className="font-semibold">{bestCost.costBpMid}bp</span>.
        </p>

        <div className="scroll-x mt-4">
          <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-2.5 pr-3 text-left"><span className="eyebrow">Mandate</span></th>
                <th className="pb-2.5 pr-3 text-left"><span className="eyebrow">Worst vendor switch</span></th>
                <th className="pb-2.5 pr-3 text-right"><span className="eyebrow">Names</span></th>
                <th className="pb-2.5 pr-3 text-right"><span className="eyebrow">Value</span></th>
                <th className="pb-2.5 text-right"><span className="eyebrow">One-off cost</span></th>
              </tr>
            </thead>
            <tbody>
              {turnover.map((t) => (
                <tr key={t.screen.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{t.screen.name}</td>
                  <td className="py-2.5 pr-3 text-muted">
                    {PROVIDERS[t.a].shortName} → {PROVIDERS[t.b].shortName}
                  </td>
                  <td className="tnum py-2.5 pr-3 text-right text-muted">
                    {t.nameTurnover}%
                  </td>
                  <td className="tnum py-2.5 pr-3 text-right font-semibold">
                    {t.valueTurnover}%
                  </td>
                  <td className="tnum py-2.5 text-right">
                    <span
                      className="font-display font-bold"
                      style={{ color: rampColor(t.costBpMid * 3) }}
                    >
                      {t.costBpMid}bp
                    </span>
                    <span className="ml-1.5 text-[10.5px] text-subtle">
                      {t.costBpLow}–{t.costBpHigh}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">Cost assumptions. </span>
          {COST_ASSUMPTIONS.oneWayBpLow}&ndash;{COST_ASSUMPTIONS.oneWayBpHigh}bp
          one-way, midpoint {COST_ASSUMPTIONS.oneWayBpMid}bp, applied to both the
          sell and buy legs. {COST_ASSUMPTIONS.note} This is an order-of-magnitude
          estimate, not a transaction-cost model: real cost depends on liquidity,
          urgency and implementation. The assumption is stated because it drives
          the answer.
        </p>
      </Card>

      {/* ---------- Sensitivity ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Does the finding survive the threshold choice?"
          hint="A result that only holds at exactly the top quartile is a result about the quartile, not about the raters."
        />
        <div className="scroll-x">
          <div className="flex min-w-[560px] items-end gap-2" style={{ height: 170 }}>
            {inf.sensitivity.map((p) => {
              const h = Math.max((p.contestedShare / 100) * 140, 6);
              const isQuartile = p.threshold === 25;
              return (
                <div key={p.threshold} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="tnum text-[10.5px] font-semibold text-muted">
                    {p.contestedShare}%
                  </span>
                  <div
                    className="w-full max-w-[42px] rounded-full transition-all"
                    style={{
                      height: h,
                      background: isQuartile
                        ? "var(--grad-hero)"
                        : "linear-gradient(180deg, var(--brand-300), var(--brand-400))",
                      opacity: isQuartile ? 1 : 0.55,
                    }}
                  />
                  <span className="text-[10px] text-subtle">
                    {p.threshold}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Contested share ranges from{" "}
          <span className="font-semibold text-ink">
            {inf.sensitivityRange.min}% to {inf.sensitivityRange.max}%
          </span>{" "}
          as the inclusion threshold moves from the top 10% to the top 50%. The
          finding is not an artefact of picking the quartile: disagreement is
          material at every threshold tested, and rises as the screen widens
          because a wider screen has more borderline names for raters to
          disagree about.
        </p>
      </Card>

      {/* ---------- Method ---------- */}
      <Card className="mt-5">
        <CardHeader title="Statistical method and its limits" />
        <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-muted">
          {[
            `Intervals are non-parametric bootstrap, ${inf.meanDivergence.iterations.toLocaleString()} resamples of companies with replacement. Chosen over a normal approximation because divergence scores are bounded and skewed, so a mean ± 1.96σ interval would misstate the tails.`,
            `The null model permutes each rater's scores independently across companies. This preserves every rater's own score distribution exactly while destroying the shared signal, which isolates the question being asked.`,
            `Group comparisons report bootstrap intervals and Cohen's d rather than p-values from a fitted model. With n=30 across four correlated predictors, a multivariate regression would produce coefficients nobody should believe.`,
            `Groups below n=${MIN_GROUP_N} are shown but excluded from effect-size comparisons and flagged. An earlier version compared a group of one against a group of eighteen and reported a finding.`,
            "Every figure is deterministic: the PRNG is seeded, so the same dataset always produces the same intervals and p-values. Statistics you cannot reproduce are worse than none.",
            "The underlying ratings are calibrated synthetic values. These are real statistics correctly applied to a synthetic dataset — the method transfers to real data unchanged, the specific numbers do not.",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[12px]">
          <Link href="/methodology" className="font-semibold text-brand underline underline-offset-2">
            Full methodology and limitations →
          </Link>
        </p>
      </Card>
    </Shell>
  );
}

/** Observed value against the null distribution band. */
function NullChart({
  observed,
  nullMean,
  nullLow,
  nullHigh,
}: {
  observed: number;
  nullMean: number;
  nullLow: number;
  nullHigh: number;
}) {
  const max = Math.max(nullHigh, observed) * 1.15;
  const pct = (v: number) => (v / max) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
        <span className="font-semibold" style={{ color: "var(--div-aligned)" }}>
          Observed
        </span>
        <span className="tnum font-bold">{observed}</span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-surface-3">
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: `${pct(observed)}%`,
            background: "var(--grad-hero)",
          }}
        />
      </div>

      <div className="mb-1.5 mt-4 flex items-baseline justify-between text-[11px]">
        <span className="font-semibold" style={{ color: "var(--div-extreme)" }}>
          Null — raters share nothing
        </span>
        <span className="tnum font-bold">{nullMean}</span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-surface-3">
        <div
          className="absolute top-0 h-full rounded-full opacity-30"
          style={{
            left: `${pct(nullLow)}%`,
            width: `${pct(nullHigh) - pct(nullLow)}%`,
            background: "var(--div-extreme)",
          }}
          title={`95% of null draws fall between ${nullLow} and ${nullHigh}`}
        />
        <div
          className="absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
          style={{ left: `${pct(nullMean)}%`, background: "var(--div-extreme)" }}
        />
      </div>
      <p className="mt-2 text-[10.5px] text-subtle">
        Shaded band is the middle 95% of null draws.
      </p>
    </div>
  );
}
