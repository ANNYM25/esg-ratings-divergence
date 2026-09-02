import Link from "next/link";
import { universeStats } from "@/lib/divergence";
import { screeningHeadline } from "@/lib/screening";
import { inferenceSummary } from "@/lib/statistics";
import { predictorSummary } from "@/lib/predictors";
import { turnoverAcrossScreens } from "@/lib/screening";
import { PROVIDERS } from "@/lib/providers";

/**
 * Findings first.
 *
 * The dashboard previously opened with methodology and made the reader assemble
 * the conclusion themselves. Anyone evaluating this — a recruiter, an
 * interviewer, a portfolio manager — gives it about ninety seconds. This block
 * states the result in the first screen, in the language the reader already
 * thinks in, and leaves the methodology to the pages built for it.
 */
export function ExecutiveSummary() {
  const stats = universeStats();
  const screening = screeningHeadline();
  const inf = inferenceSummary();
  const pred = predictorSummary();
  const cost = turnoverAcrossScreens()[0];

  return (
    <section
      className="print-avoid-break relative overflow-hidden rounded-[20px] p-6 text-white sm:p-8"
      style={{ background: "var(--grad-hero)", boxShadow: "var(--shadow-glow)" }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <span
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(141,211,174,0.25) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-white/50">
          Executive summary
        </div>

        <h2 className="mt-2.5 max-w-3xl font-display text-[26px] font-bold leading-[1.15] tracking-tight sm:text-[32px]">
          Four ESG raters, one universe, and a{" "}
          <span style={{ color: "var(--brand-300)" }}>
            {screening.meanContestedShare}% disagreement
          </span>{" "}
          about which companies are actually eligible.
        </h2>

        <div className="mt-5 grid gap-x-8 gap-y-4 lg:grid-cols-2">
          <div>
            <p className="text-[13.5px] leading-relaxed text-white/70">
              Across four standard institutional screens applied to the same 30
              companies,{" "}
              <span className="font-semibold text-white">
                {screening.meanContestedShare}% of holdings change eligibility
              </span>{" "}
              depending on which rating vendor is used. On a top-quartile
              mandate, two vendors&rsquo; portfolios overlap by as little as{" "}
              <span className="font-semibold text-white">
                {screening.worstOverlap.overlap}%
              </span>{" "}
              — switching provider would turn over most of the book for reasons
              unrelated to the companies.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">
              This is not noise, and it is tested rather than asserted. Against a
              permutation null in which the raters share no signal, observed
              divergence of {inf.nullTest.observed} sits far below the null&rsquo;s{" "}
              {inf.nullTest.nullMean} (p{" "}
              {inf.nullTest.pValue === 0
                ? `< ${(1 / inf.nullTest.iterations).toFixed(3)}`
                : `= ${inf.nullTest.pValue}`}
              ). The raters do measure a shared construct — the disagreement that
              survives is the part that moves portfolios.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">
              It is also{" "}
              <span className="font-semibold text-white">predictable</span>:{" "}
              {pred.supported} of {pred.total} pre-stated hypotheses hold, and{" "}
              {pred.strongest.attribute.toLowerCase()} is the strongest driver
              (Cohen&rsquo;s d {pred.strongest.effectSize}). Divergence
              concentrates exactly where methodology choices have room to bite.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {[
              {
                k: "Holdings contested",
                v: `${screening.meanContestedShare}%`,
                s: "mean across four mandates",
              },
              {
                k: "Worst overlap",
                v: `${screening.worstOverlap.overlap}%`,
                s: "top-quartile portfolios",
              },
              {
                k: "Mean divergence",
                v: inf.meanDivergence.estimate.toFixed(0),
                s: `95% CI ${inf.meanDivergence.low}–${inf.meanDivergence.high}`,
              },
              {
                k: "Switch cost",
                v: `${cost.costBpMid}bp`,
                s: "worst mandate, one-off",
              },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.09)" }}
              >
                <div className="text-[9.5px] uppercase tracking-wider text-white/45">
                  {x.k}
                </div>
                <div
                  className="tnum mt-1 font-display text-[22px] font-bold leading-none"
                  style={{ color: "var(--brand-300)" }}
                >
                  {x.v}
                </div>
                <div className="mt-1 text-[9.5px] text-white/45">{x.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Why it matters commercially */}
        <div className="mt-6 grid gap-4 border-t border-white/15 pt-5 sm:grid-cols-3">
          <div>
            <div className="font-display text-[12.5px] font-bold">
              The regulatory driver
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              The EU ESG Rating Regulation and ESMA&rsquo;s supervisory work
              target exactly this: raters producing incompatible assessments with
              little transparency about why. Disclosure obligations make the
              question a compliance one, not just an analytical one.
            </p>
          </div>
          <div>
            <div className="font-display text-[12.5px] font-bold">
              The actionable finding
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              Screen design matters more than vendor choice. Rank-based
              exclusions leave {screening.best.contestedShare}% of holdings
              contested; absolute score floors leave{" "}
              {screening.worst.contestedShare}%. Raters disagree about levels far
              more than about ordering.
            </p>
          </div>
          <div>
            <div className="font-display text-[12.5px] font-bold">
              What this tool adds
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              Not another aggregate score. A deterministic attribution of each
              disagreement to the methodology attribute that caused it —
              benchmark basis, disclosure treatment, controversy handling —
              auditable line by line.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/screening"
            className="rounded-xl px-4 py-2.5 font-display text-[13px] font-semibold transition-transform active:scale-[0.98]"
            style={{ background: "var(--brand-300)", color: "var(--brand-900)" }}
          >
            See the portfolio impact →
          </Link>
          <Link
            href="/research"
            className="rounded-xl px-4 py-2.5 font-display text-[13px] font-semibold text-white/85 transition-colors hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.22)" }}
          >
            Research findings
          </Link>
          <Link
            href={`/company/${stats.mostDivergent.ticker}`}
            className="rounded-xl px-4 py-2.5 font-display text-[13px] font-semibold text-white/85 transition-colors hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.22)" }}
          >
            Worked example: {stats.mostDivergent.ticker}
          </Link>
        </div>

        <p className="mt-4 text-[10.5px] leading-relaxed text-white/40">
          Ratings are calibrated synthetic values, not published vendor scores —
          those are proprietary and licensed. The correlation structure is
          calibrated to the empirical range reported by Berg, Kölbel &amp;
          Rigobon (2022);{" "}
          {PROVIDERS.msci.shortName}, {PROVIDERS.sustainalytics.shortName},{" "}
          {PROVIDERS.lseg.shortName} and {PROVIDERS.spcsa.shortName} methodologies
          are encoded from their own published documentation. Research and
          education tool. Not investment advice.
        </p>
      </div>
    </section>
  );
}
