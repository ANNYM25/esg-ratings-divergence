import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Shell } from "@/components/shell";
import { Card, CardHeader, BandBadge, Empty } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { ProviderRatingCard } from "@/components/rating-cards";
import { DivergenceGauge, NormalisedBars, PillarRadar } from "@/components/charts";
import { ExplanationPanel, MethodologyDiff, HeadToHead } from "@/components/explanation";
import { DownloadButton } from "@/components/download-button";
import { NarrativePanel } from "@/components/agents/narrative-panel";
import { ScaleToggle } from "@/components/scale-toggle";

import { COMPANIES, SECTORS, getCompany, companiesInSector } from "@/data/companies";
import { normalisedRatingsFor, sectorMedian, consensusScore } from "@/lib/normalise";
import { computeDivergence, PROFILES } from "@/lib/divergence";
import { explain } from "@/lib/explain";
import { screeningForCompany } from "@/lib/screening";
import { PROVIDERS } from "@/lib/providers";
import { PROVIDER_COLOR, rampColor } from "@/lib/ui";
import type { Pillar, ProviderId } from "@/lib/types";

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const company = getCompany(ticker);
  if (!company) return { title: "Not found" };
  return {
    title: `${company.name} (${company.ticker})`,
    description: `ESG rating divergence analysis for ${company.name} across MSCI, Sustainalytics, LSEG and S&P Global.`,
  };
}

const PILLAR_LABEL: Record<Pillar, string> = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const company = getCompany(ticker);
  if (!company) notFound();

  const ratings = normalisedRatingsFor(company.ticker);
  const divergence = computeDivergence(company.ticker);
  const explanation = explain(company.ticker);
  const median = sectorMedian(company.ticker);
  const consensus = consensusScore(company.ticker);
  const screening = screeningForCompany(company.ticker) ?? [];
  const peers = companiesInSector(company.sector).filter(
    (c) => c.ticker !== company.ticker,
  );

  const pairProviders: ProviderId[] = divergence.widestPair
    ? [divergence.widestPair.a, divergence.widestPair.b]
    : ratings.slice(0, 2).map((r) => r.provider);

  return (
    <Shell
      title={company.name}
      subtitle={`${SECTORS[company.sector].name} · ${company.subIndustry} · ${company.country} · $${company.marketCapUsdB.toLocaleString()}B market cap`}
      exportTicker={company.ticker}
      actions={
        <Link
          href={`/compare?tickers=${company.ticker}`}
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 font-display text-[13px] font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand"
        >
          Compare
        </Link>
      }
    >
      <ProvenanceBanner />

      {/* Headline strip */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="flex flex-col items-center justify-center">
          <DivergenceGauge score={divergence.score} band={divergence.band} />

          <div className="mt-4 w-full space-y-1.5 border-t border-line pt-3.5 text-[11.5px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-subtle">Level spread</span>
              <span className="tnum font-semibold">
                {divergence.normalisedRange.toFixed(1)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-subtle">Rank spread</span>
              <span className="tnum font-semibold">
                {divergence.percentileRange.toFixed(1)}
              </span>
            </div>
            <p className="pt-1 text-[10.5px] text-subtle">
              Score is the larger of the two.
            </p>
          </div>

          <div className="mt-3 w-full rounded-xl bg-surface-2 p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-subtle">
              Disagreement type
            </div>
            <div className="mt-0.5 text-[12.5px] font-semibold">
              {PROFILES[divergence.profile].label}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {PROFILES[divergence.profile].description}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Where the providers land"
            hint="Each provider's own rating is the headline. The common-scale figure beneath it is ours, derived — never a published number."
            action={<DownloadButton dataset="ratings" ticker={company.ticker} />}
          />
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {ratings.map((r) => (
              <ProviderRatingCard key={r.provider} rating={r} />
            ))}
          </div>
        </Card>
      </div>

      {/* Comparison + explanation */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.25fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="Normalised comparison"
              hint="Sector percentile is the honest common ground; the raw normalised axis is the weaker view because it puts an industry-relative rating next to an absolute one."
              action={
                <>
                  <DownloadButton dataset="normalised" ticker={company.ticker} />
                  <ScaleToggle />
                </>
              }
            />
            <NormalisedBarsWithToggle ratings={ratings} median={median} />

            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
              <Stat label="Consensus" value={consensus?.toFixed(1) ?? "—"} />
              <Stat
                label="Spread"
                value={divergence.normalisedRange.toFixed(1)}
                color={rampColor(divergence.score)}
              />
              <Stat label="Std dev" value={divergence.stdDev.toFixed(1)} />
            </dl>
          </Card>

          {Object.keys(divergence.pillarRanges).length > 0 && (
            <Card>
              <CardHeader
                title="Pillar-level disagreement"
                hint="Aggregate scores often agree while the pillars underneath them do not. This is usually where the real finding is."
              />
              <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="space-y-3">
                  {(Object.keys(divergence.pillarRanges) as Pillar[]).map((p) => {
                    const range = divergence.pillarRanges[p]!;
                    return (
                      <div key={p}>
                        <div className="mb-1 flex items-baseline justify-between text-[12px]">
                          <span className="font-medium">{PILLAR_LABEL[p]}</span>
                          <span
                            className="tnum font-semibold"
                            style={{ color: rampColor(range) }}
                          >
                            {range.toFixed(1)} spread
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(range, 100)}%`,
                              background: rampColor(range),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <PillarRadar ratings={ratings} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Company signals"
              hint="The company-side attributes the explanation engine reasons over."
            />
            <div className="space-y-3 text-[12.5px]">
              <Signal label="Disclosure" value={company.attributes.disclosure} />
              <Signal label="Controversy level" value={company.attributes.controversy} />
              <Signal label="Carbon intensity" value={company.attributes.carbonIntensity} />
              <Signal
                label="Product alignment"
                value={company.attributes.productAlignment}
              />
              <FlagList
                label="Governance flags"
                items={company.attributes.governanceFlags}
              />
              <FlagList label="Social flags" items={company.attributes.socialFlags} />
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Pairwise gaps"
              hint="All provider pairs, ranked by normalised distance."
            />
            {divergence.pairs.length === 0 ? (
              <Empty message="Not enough ratings to form a pair." />
            ) : (
              <div className="space-y-2.5">
                {divergence.pairs.map((p) => (
                  <div
                    key={`${p.a}-${p.b}`}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px]">
                      <span
                        className="font-semibold"
                        style={{ color: PROVIDER_COLOR[p.a] }}
                      >
                        {PROVIDERS[p.a].shortName}
                      </span>
                      <span className="text-subtle">vs</span>
                      <span
                        className="font-semibold"
                        style={{ color: PROVIDER_COLOR[p.b] }}
                      >
                        {PROVIDERS[p.b].shortName}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-right">
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: rampColor(p.normalisedDelta) }}
                      >
                        {p.normalisedDelta.toFixed(1)}
                      </span>
                      <span className="ml-2 text-[10.5px] text-subtle">
                        {p.percentileDelta.toFixed(0)} pctl
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="Why they disagree"
              hint={`Analysing the widest pair: ${PROVIDERS[pairProviders[0]].shortName} versus ${PROVIDERS[pairProviders[1]].shortName}. Every driver below is derived deterministically from the two methodologies — nothing here is generated.`}
              action={
              <>
                <DownloadButton dataset="drivers" ticker={company.ticker} label="Reasons" />
                <BandBadge band={divergence.band} score={divergence.score} />
              </>
            }
            />
            <HeadToHead pair={pairProviders} ratings={ratings} />
            <ExplanationPanel explanation={explanation} />
            <NarrativePanel ticker={company.ticker} />
          </Card>

          <Card>
            <CardHeader
              title="Methodology diff"
              hint="Attribute-by-attribute comparison of the two most divergent providers."
            />
            <MethodologyDiff providers={pairProviders} />
          </Card>
        </div>
      </div>

      {/* Screening eligibility */}
      <Card className="mt-5">
        <CardHeader
          title="Would you hold it?"
          hint="The same four mandates applied under each vendor. This is where the disagreement stops being academic."
          action={<DownloadButton dataset="screening" />}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {screening.map(({ screen, result, verdict }) => (
            <div
              key={screen.id}
              className="rounded-2xl border border-line p-3.5"
              style={{
                background:
                  verdict === "contested"
                    ? "var(--warn-soft)"
                    : "var(--surface-2)",
              }}
            >
              <div className="text-[11.5px] font-semibold">{screen.name}</div>
              <div
                className="mt-1.5 font-display text-[14px] font-bold capitalize"
                style={{
                  color:
                    verdict === "contested"
                      ? "var(--warn)"
                      : verdict === "included"
                        ? "var(--div-aligned)"
                        : "var(--div-extreme)",
                }}
              >
                {verdict === "contested"
                  ? `Contested ${result.passCount}\u2013${result.providerCount - result.passCount}`
                  : verdict === "included"
                    ? "Held by all"
                    : "Excluded by all"}
              </div>
              {verdict === "contested" && (
                <p className="mt-1.5 text-[10.5px] leading-snug text-muted">
                  Held by {result.includedBy.map((p) => PROVIDERS[p].shortName).join(", ")}.
                  Excluded by {result.excludedBy.map((p) => PROVIDERS[p].shortName).join(", ")}.
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-subtle">
          A contested verdict means this holding&rsquo;s eligibility depends on
          which vendor your firm licenses, not on anything about the company.
        </p>
      </Card>

      {/* Sector peers */}
      <div className="mt-5">
        <Card>
          <CardHeader
            title={`${SECTORS[company.sector].short} peers`}
            hint="Same sector, same treatment. Compare how the pattern holds."
          />
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {peers.map((p) => {
              const d = computeDivergence(p.ticker);
              return (
                <Link
                  key={p.ticker}
                  href={`/company/${p.ticker}`}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="tnum w-12 shrink-0 mono text-[11.5px] font-bold text-brand">
                    {p.ticker}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {p.name}
                  </span>
                  <span
                    className="tnum shrink-0 text-[12.5px] font-semibold"
                    style={{ color: rampColor(d.score) }}
                  >
                    {d.score.toFixed(0)}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

    </Shell>
  );
}

/* Client boundary kept minimal: only the toggle needs interactivity. */
function NormalisedBarsWithToggle({
  ratings,
  median,
}: {
  ratings: ReturnType<typeof normalisedRatingsFor>;
  median: number | null;
}) {
  return (
    <>
      <div data-scale-view="normalised">
        <NormalisedBars ratings={ratings} median={median} mode="normalised" />
      </div>
      <div data-scale-view="percentile" hidden>
        <NormalisedBars ratings={ratings} mode="percentile" />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wide text-subtle">
        {label}
      </dt>
      <dd
        className="tnum mt-0.5 font-display text-[19px] font-bold"
        style={color ? { color } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2.5 last:border-0">
      <span className="text-subtle">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function FlagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 text-subtle">{label}</div>
      {items.length === 0 ? (
        <span className="text-[11.5px] text-subtle">None recorded</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((f) => (
            <span
              key={f}
              className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
