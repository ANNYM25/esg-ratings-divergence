import { Shell } from "@/components/shell";
import { Card, CardHeader } from "@/components/primitives";
import { BANDS } from "@/lib/divergence";
import { LITERATURE_ATTRIBUTION, CATEGORY_LABELS } from "@/lib/explain";
import { VALIDATION } from "@/lib/validate";
import { rampColor } from "@/lib/ui";
import { DownloadButton } from "@/components/download-button";
import type { DivergenceBand, DivergenceCategory } from "@/lib/types";

export const metadata = { title: "Methodology" };

export default function MethodologyPage() {

  return (
    <Shell
      title="Methodology & limitations"
      subtitle="How every number on this site is produced, and what it cannot tell you."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Card id="provenance">
            <CardHeader title="Data provenance" action={<DownloadButton dataset="ratings" />} />

            <div
              className="mb-4 rounded-xl border p-4"
              style={{
                background: "var(--warn-soft)",
                borderColor: "var(--warn-border)",
              }}
            >
              <p className="text-[13px] font-semibold" style={{ color: "var(--warn)" }}>
                All {VALIDATION.total} records are calibrated synthetic values.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                MSCI, Sustainalytics and LSEG ESG data is proprietary and has no
                free API. Yahoo Finance&rsquo;s ESG endpoint — the commonly cited
                free proxy — was Sustainalytics-derived and has been unreliable
                since roughly 2023. Scraping the providers&rsquo; public
                rating-lookup pages raises terms-of-service problems.
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Rather than fabricate a data pipeline that cannot exist, the
                values were constructed in two documented, reproducible stages.
                First, written by hand to reproduce the divergence patterns the
                literature records. Second, calibrated by{" "}
                <Code>scripts/calibrate.mts</Code>, which injects deterministic
                idiosyncratic variance until all six pairwise rank correlations
                fall inside the 0.38&ndash;0.71 range Berg, Kölbel &amp; Rigobon
                report &mdash; subject to constraints that each rater&rsquo;s view
                of each sector is unchanged, no value moves more than 18 points,
                and the named narrative cases do not flip.
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                The result is a dataset whose correlation{" "}
                <em>structure</em> matches the empirical literature even though no
                individual value is a real rating. That makes it suitable for
                demonstrating and testing the analytics, and unsuitable for any
                statement about a real company. Run{" "}
                <Code>npm run calibrate</Code> to reproduce the report.
              </p>
            </div>

            <h3 className="mb-2 font-display text-[13px] font-bold">
              Turning this into a real tool
            </h3>
            <ol className="space-y-2 text-[13px] leading-relaxed text-muted">
              <Step n={1}>
                Open <Code>src/data/ratings.ts</Code>. Each row is one company
                across four providers.
              </Step>
              <Step n={2}>
                Replace each figure with one transcribed from the provider&rsquo;s
                own public disclosure, or from a licensed terminal if you have
                access.
              </Step>
              <Step n={3}>
                Set <Code>sourceUrl</Code> to the page you took it from and{" "}
                <Code>asOf</Code> to the provider&rsquo;s stated rating date.
              </Step>
              <Step n={4}>
                Flip <Code>verified</Code> to <Code>true</Code> and change{" "}
                <Code>provenance</Code> to <Code>&quot;provider_public&quot;</Code>.
              </Step>
              <Step n={5}>
                The banner disappears on its own once every record is verified.
                The validator in <Code>src/lib/validate.ts</Code> reports what is
                still outstanding.
              </Step>
            </ol>

            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              The provider adapter interface means a live API can replace the
              static file without touching anything downstream. S&amp;P Global
              CSA scores and CDP disclosure scores are genuinely public and are
              the realistic starting point for automated ingestion.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Normalisation"
              hint="Three decisions carry the credibility of every comparison on this site."
            />
            <ol className="space-y-4 text-[13px] leading-relaxed text-muted">
              <Numbered n="1" title="Sustainalytics is inverted, not translated">
                Its raw figure is unmanaged ESG risk, so a lower number is a
                better outcome. We map it as{" "}
                <Code>100 − (risk ÷ 50) × 100</Code>. The practical maximum is 50,
                not the theoretical 100, because essentially no rated company
                exceeds 50 — normalising against 100 would compress every real
                company into the top half of the axis and destroy the signal.
              </Numbered>
              <Numbered n="2" title="MSCI letters are intervals, not points">
                &ldquo;AA&rdquo; spans 7.143–8.570 on the underlying 0–10 score.
                Every MSCI value on this site therefore carries an uncertainty
                band equal to the width of its bucket, and the charts render it.
                Treating a letter grade as a point estimate is the most common
                error in ESG comparison work and it manufactures precision that
                does not exist.
              </Numbered>
              <Numbered n="3" title="Percentile is the honest view">
                Comparing an industry-relative rating to an absolute one on a raw
                axis is apples-to-oranges by construction. Sector percentile is
                the only genuinely common ground, which is why it is offered as a
                first-class toggle rather than buried.
              </Numbered>
            </ol>
          </Card>

          <Card id="literature">
            <CardHeader
              title="The divergence decomposition"
              hint="Every driver the explanation engine emits is attributed to one of three categories."
            />
            <div
              className="mb-4 rounded-xl px-3.5 py-3"
              style={{ background: "var(--brand-50)" }}
            >
              <div className="eyebrow mb-1">Source</div>
              <p className="text-[12.5px] leading-relaxed">
                Florian Berg, Julian F Kölbel &amp; Roberto Rigobon (2022).{" "}
                <em>Aggregate Confusion: The Divergence of ESG Ratings.</em>{" "}
                <span className="text-muted">
                  Review of Finance, 26(6), 1315–1344.
                </span>
              </p>
            </div>

            <p className="text-[13px] leading-relaxed text-muted">
              Studying six major raters, Berg, Kölbel and Rigobon attribute
              divergence to three sources and find pairwise correlations of
              roughly 0.38–0.71 — high enough that the raters are measuring
              something real, low enough that which one you use materially
              changes your conclusion.
            </p>

            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">
                What this tool takes from the paper, and what it does not.
              </span>{" "}
              The scope / measurement / weight decomposition, the 56 / 38 / 6
              attribution averages shown against your own results, and the
              correlation benchmark are all theirs. The composite divergence
              score, the four bands, and the disagreement-type classification are
              this tool&rsquo;s own constructions and carry no academic authority.
            </p>

            <div className="mt-4 space-y-3">
              {(
                ["measurement", "scope", "weight"] as DivergenceCategory[]
              ).map((k) => (
                <div key={k} className="rounded-xl bg-surface-2 p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold">
                      {CATEGORY_LABELS[k].label}
                    </span>
                    <span className="tnum text-[13px] font-semibold text-muted">
                      {LITERATURE_ATTRIBUTION[k]}%
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {CATEGORY_LABELS[k].description}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[12.5px] leading-relaxed text-subtle">
              The attribution shown on each company page is computed from the
              rules that fired for that specific pairing, so it will not match
              the literature figures exactly — the literature reports an average
              across a large universe, while a single company can be dominated by
              one driver.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="The explanation engine"
              hint="What generates the narrative, and what constrains it."
            />
            <p className="text-[13px] leading-relaxed text-muted">
              Explanations are produced by a deterministic rules engine that
              diffs two providers&rsquo; structured methodology profiles and
              checks each difference against the company&rsquo;s own attributes.
              There is no model in the loop, no randomness, and no API call. The
              same inputs always produce the same explanation, and every claim
              traces back to a named methodology attribute you can inspect on the{" "}
              <a href="/providers" className="text-brand underline underline-offset-2">
                Providers
              </a>{" "}
              page.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              The roadmap adds an optional narrative layer on top, where Claude
              rephrases the structured drivers into analyst prose. That layer is
              constrained by design: it may rephrase drivers, and it may never
              compute a number or introduce a fact not present in the rules
              output. Keeping computation and narration strictly separated is
              what makes the output auditable.
            </p>
          </Card>

          <Card>
            <CardHeader title="Limitations" />
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted">
              <Bullet>
                The seed dataset is illustrative and point-in-time. It is not a
                live feed and it is not verified against the providers.
              </Bullet>
              <Bullet>
                Normalisation across incommensurable scales is inherently lossy.
                A single 0–100 number cannot fully reconcile a risk metric with a
                performance metric — the normalised view is a navigational aid,
                not a truth.
              </Bullet>
              <Bullet>
                Percentiles are computed within this 30-company universe, not
                against the provider&rsquo;s full coverage. With six companies per
                sector the finest possible percentile step is 16.7 points, so the
                rank component of the divergence score moves in visible jumps and
                will overstate small ordering differences. Widening the universe
                is the fix, and it is the single highest-value change to make
                after replacing the seed data.
              </Bullet>
              <Bullet>
                The explanation engine identifies which methodology differences
                are <em>capable</em> of producing an observed gap. It does not
                have access to the providers&rsquo; underlying indicator-level
                data, so it cannot prove that a given driver caused a specific
                number.
              </Bullet>
              <Bullet>
                Provider methodologies change. The profiles encoded here are a
                snapshot and need periodic review.
              </Bullet>
              <Bullet>
                This is a research and education tool.{" "}
                <span className="font-medium text-ink">
                  Nothing here is investment advice.
                </span>
              </Bullet>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Divergence score" />
            <div className="rounded-xl bg-surface-2 p-3.5 font-mono text-[11.5px] leading-relaxed">
              score = max(
              <br />
              &nbsp;&nbsp;normalisedRange,
              <br />
              &nbsp;&nbsp;percentileRange
              <br />)
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              The two components answer different questions. The normalised
              range asks how far apart the scores are. The percentile range asks
              how differently the providers <em>rank</em> the company against its
              peers.
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
              <span className="font-medium text-ink">
                Why the larger of the two, not an average.{" "}
              </span>
              An earlier version averaged them, and it produced a false negative
              worth recording. Meta Platforms is ranked last in technology by all
              four providers, so its rank spread is zero — while the providers
              sit 30 points apart on level. The average scored that 15 and called
              it &ldquo;Aligned&rdquo;. Agreement on rank had cancelled out
              disagreement on level. Disagreement in either dimension is
              disagreement, so the composite takes the larger, and the{" "}
              <em>disagreement type</em> shown on each company page names which
              kind it is.
            </p>

            <div
              className="mt-3 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed"
              style={{ background: "var(--surface-2)" }}
            >
              <span className="font-semibold text-ink">Attribution. </span>
              <span className="text-muted">
                This composite formula is{" "}
                <span className="font-semibold text-ink">this tool&rsquo;s own</span>,
                not a published measure. It does not come from Berg, Kölbel &amp;
                Rigobon and should not be cited as theirs. What is genuinely
                theirs — and is credited wherever it appears — is the{" "}
                scope / measurement / weight decomposition, the 56 / 38 / 6
                literature averages, and the 0.38–0.71 correlation benchmark.
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {(Object.keys(BANDS) as DivergenceBand[]).map((b) => (
                <div key={b} className="flex items-start gap-2.5">
                  <span
                    className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: rampColor(
                        b === "aligned" ? 5 : b === "mild" ? 25 : b === "significant" ? 45 : 80,
                      ),
                    }}
                  />
                  <div>
                    <div className="text-[12px] font-medium">
                      {BANDS[b].label}{" "}
                      <span className="tnum font-normal text-subtle">
                        {BANDS[b].min}–{BANDS[b].max}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-subtle">
                      {BANDS[b].description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Why this matters now" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              ESG ratings divergence is not a niche technical complaint. The EU
              ESG Rating Regulation and ESMA&rsquo;s supervisory work target
              exactly this problem: raters producing incompatible assessments of
              the same company with little transparency about why.
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
              For an investor, the practical question is not &ldquo;which rating
              is right&rdquo; but &ldquo;which rating answers my question&rdquo;.
              A risk-management mandate and an impact mandate should not be
              reaching for the same score.
            </p>
          </Card>

          <Card>
            <CardHeader title="Validation status" />
            <dl className="space-y-2 text-[12.5px]">
              <Row k="Total records" v={String(VALIDATION.total)} />
              <Row k="Verified" v={String(VALIDATION.verified)} />
              <Row k="Illustrative" v={String(VALIDATION.illustrative)} />
              <Row
                k="Schema errors"
                v={String(
                  VALIDATION.issues.filter((i) => i.severity === "error").length,
                )}
              />
              <Row
                k="Warnings"
                v={String(
                  VALIDATION.issues.filter((i) => i.severity === "warning")
                    .length,
                )}
              />
            </dl>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11.5px] text-ink">
      {children}
    </code>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="tnum mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10.5px] font-semibold">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Numbered({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="tnum text-[11px] font-bold text-brand">{n}</span>
        <span className="text-[13px] font-semibold text-ink">{title}</span>
      </div>
      <p className="pl-[22px]">{children}</p>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
      <span>{children}</span>
    </li>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
      <dt className="text-subtle">{k}</dt>
      <dd className="tnum font-semibold">{v}</dd>
    </div>
  );
}
