import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, StatCard } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { DownloadButton } from "@/components/download-button";
import { analyseAllScreens, screeningHeadline } from "@/lib/screening";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/providers";
import { SECTORS } from "@/data/companies";
import { PROVIDER_COLOR } from "@/lib/ui";

export const metadata = { title: "Screening impact" };

export default function ScreeningPage() {
  const screens = analyseAllScreens();
  const h = screeningHeadline();

  return (
    <Shell
      title="Screening impact"
      subtitle="What rater disagreement actually costs a portfolio: how many holdings change eligibility depending on which vendor you license."
    >
      <ProvenanceBanner />

      {/* ---------- The commercial claim ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Why this is the number that matters"
          hint="Divergence as a 0-100 score is an academic finding. Divergence as portfolio turnover is an investment problem."
        />
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-[13.5px] leading-relaxed text-muted">
              A portfolio manager does not care, in the abstract, that MSCI and
              Sustainalytics disagree about a company. They care whether their ESG
              screen produces a{" "}
              <span className="font-semibold text-ink">different portfolio</span>{" "}
              depending on which vendor their firm happens to license — because
              that is simultaneously a procurement decision, a mandate-compliance
              question and a tracking-error problem.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
              Each screen below is worded the way a real mandate is worded, then
              applied four times — once per vendor — over the same universe. A
              holding is{" "}
              <span className="font-semibold text-ink">contested</span> when at
              least one vendor would include it and at least one would exclude it.
            </p>
          </div>

          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: "var(--grad-hero)" }}
          >
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-white/50">
              Headline
            </div>
            <p className="mt-2 font-display text-[19px] font-bold leading-snug">
              On a top-quartile mandate, MSCI&rsquo;s and LSEG&rsquo;s portfolios
              overlap by only {h.worstOverlap.overlap}%.
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/65">
              Switching vendor would replace roughly{" "}
              {100 - h.worstOverlap.overlap}% of the holdings, for reasons that
              have nothing to do with the companies themselves.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------- KPIs ---------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          featured
          label="Mean contested share"
          value={`${h.meanContestedShare}%`}
          delta="across four standard mandates"
          hint="Holdings whose eligibility depends on the vendor, averaged over all four screens"
        />
        <StatCard
          label="Most exposed screen"
          value={`${h.worst.contestedShare}%`}
          unit="contested"
          accent="var(--div-extreme)"
          hint={h.worst.screen.name}
        />
        <StatCard
          label="Most robust screen"
          value={`${h.best.contestedShare}%`}
          unit="contested"
          accent="var(--div-aligned)"
          hint={h.best.screen.name}
        />
        <StatCard
          label="Ever contested"
          value={h.everContested}
          unit="of 30"
          accent="var(--div-significant)"
          hint="Holdings whose eligibility flips under at least one screen"
        />
      </div>

      {/* ---------- The actionable finding ---------- */}
      <Card className="mt-5">
        <CardHeader title="The finding a manager can act on" />
        <p className="text-[13.5px] leading-relaxed">
          Screen design changes exposure to this problem by more than a factor of
          two.{" "}
          <span className="font-semibold">
            {h.best.screen.name} leaves {h.best.contestedShare}% of holdings
            contested; {h.worst.screen.name} leaves {h.worst.contestedShare}%.
          </span>{" "}
          The pattern is consistent: screens written against a{" "}
          <span className="font-semibold">rank</span> are materially more robust
          to vendor choice than screens written against an{" "}
          <span className="font-semibold">absolute score</span>, because raters
          disagree about levels far more than they disagree about ordering.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Practical implication: a mandate that says &ldquo;score of 50 or
          above&rdquo; is inheriting its vendor&rsquo;s calibration choices. One
          that says &ldquo;bottom decile excluded&rdquo; is not. If a mandate must
          use an absolute floor, the vendor should be named in the mandate — not
          treated as an interchangeable input.
        </p>
      </Card>

      {/* ---------- Per-screen breakdown ---------- */}
      <div className="mt-5 space-y-5">
        {screens.map((s) => (
          <Card key={s.screen.id} padded={false}>
            <div className="p-5 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[16px] font-bold tracking-tight">
                    {s.screen.name}
                  </h2>
                  <p className="mono mt-1 text-[11.5px] italic text-muted">
                    &ldquo;{s.screen.mandateLanguage}&rdquo;
                  </p>
                  <p className="mt-1.5 max-w-2xl text-[12px] text-subtle">
                    {s.screen.usedFor}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="tnum font-display text-[26px] font-bold leading-none"
                    style={{
                      color:
                        s.contestedShare > 50
                          ? "var(--div-extreme)"
                          : s.contestedShare > 30
                            ? "var(--div-significant)"
                            : "var(--div-aligned)",
                    }}
                  >
                    {s.contestedShare}%
                  </div>
                  <div className="text-[10.5px] text-subtle">contested</div>
                </div>
              </div>

              {/* Portfolio size by vendor */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {PROVIDER_IDS.map((p) => (
                  <div
                    key={p}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      background: `color-mix(in oklab, ${PROVIDER_COLOR[p]} 7%, var(--surface-2))`,
                    }}
                  >
                    <div
                      className="text-[10.5px] font-semibold"
                      style={{ color: PROVIDER_COLOR[p] }}
                    >
                      {PROVIDERS[p].shortName}
                    </div>
                    <div className="tnum mt-0.5 font-display text-[19px] font-bold leading-none">
                      {s.portfolioSizeByProvider[p]}
                      <span className="ml-1 text-[11px] font-medium text-subtle">
                        holdings
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Lowest pairwise overlap:{" "}
                <span className="font-semibold text-ink">
                  {s.minOverlap.overlap}%
                </span>{" "}
                between {PROVIDERS[s.minOverlap.a].shortName} and{" "}
                {PROVIDERS[s.minOverlap.b].shortName}. {s.unanimousInclude} holding
                {s.unanimousInclude === 1 ? "" : "s"} pass under every vendor;{" "}
                {s.unanimousExclude} fail under every vendor.
              </p>
            </div>

            {s.contested.length > 0 && (
              <div className="scroll-x border-t border-line">
                <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-2">
                      <th className="py-2.5 pl-5 pr-3 text-left">
                        <span className="eyebrow">Contested holding</span>
                      </th>
                      <th className="py-2.5 pr-3 text-left">
                        <span className="eyebrow">Sector</span>
                      </th>
                      {PROVIDER_IDS.map((p) => (
                        <th key={p} className="py-2.5 pr-3 text-center">
                          <span
                            className="text-[10.5px] font-bold uppercase tracking-wide"
                            style={{ color: PROVIDER_COLOR[p] }}
                          >
                            {PROVIDERS[p].shortName}
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 pr-5 text-left">
                        <span className="eyebrow">Split</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.contested.map((c) => (
                      <tr key={c.ticker} className="border-b border-line last:border-0">
                        <td className="py-2 pl-5 pr-3">
                          <Link href={`/company/${c.ticker}`} className="hover:underline">
                            <span className="mono mr-2 text-[11px] font-bold text-brand">
                              {c.ticker}
                            </span>
                            {c.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-[11.5px] text-muted">
                          {SECTORS[c.sector].short}
                        </td>
                        {PROVIDER_IDS.map((p) => (
                          <td key={p} className="py-2 pr-3 text-center">
                            {c.byProvider[p] === null ? (
                              <span className="text-subtle">—</span>
                            ) : c.byProvider[p] ? (
                              <span
                                className="text-[13px] font-bold"
                                style={{ color: "var(--div-aligned)" }}
                                title="Would be held"
                              >
                                ✓
                              </span>
                            ) : (
                              <span
                                className="text-[13px] font-bold"
                                style={{ color: "var(--div-extreme)" }}
                                title="Would be excluded"
                              >
                                ✗
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="tnum py-2 pr-5 text-[11.5px] text-muted">
                          {c.passCount}–{c.providerCount - c.passCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ---------- Method ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Method and limitations"
          action={<DownloadButton dataset="normalised" />}
        />
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted">
          {[
            "Rank-based screens use the universe percentile; the best-in-class screen uses the sector percentile, since that is what a sector-neutral mandate means.",
            "The absolute floor is applied to the normalised 0-100 common scale, not to any vendor's native scale — that translation is itself a modelling choice and is documented on the methodology page.",
            "Equal weighting is assumed. A real portfolio weighted by market cap would show a different, usually larger, turnover figure because the contested names are not evenly sized.",
            "Thirty companies is a demonstration universe. Percentile thresholds on a small universe are coarser than they would be on a real index.",
            "The underlying ratings are calibrated synthetic values, not published vendor scores. The mechanism is real; the specific percentages are not a claim about any actual company or vendor.",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
