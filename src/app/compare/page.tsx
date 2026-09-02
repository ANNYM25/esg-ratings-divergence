import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, BandBadge, Empty } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { NormalisedBars } from "@/components/charts";
import { CompanyPicker } from "@/components/company-picker";
import { COMPANIES, SECTORS, getCompany } from "@/data/companies";
import { normalisedRatingsFor, consensusScore } from "@/lib/normalise";
import { computeDivergence } from "@/lib/divergence";
import { explain } from "@/lib/explain";
import { PROVIDERS } from "@/lib/providers";
import { rampColor } from "@/lib/ui";

export const metadata = { title: "Compare" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ tickers?: string }>;
}) {
  const { tickers } = await searchParams;

  const selected = (tickers ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .map(getCompany)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, 4);

  return (
    <Shell
      title="Compare companies"
      subtitle="Put up to four companies side by side. Useful for showing that divergence is a property of the methodology pairing, not a quirk of one company."
    >
      <ProvenanceBanner />

      <Card className="mt-5">
        <CardHeader
          title="Selection"
          hint="Pick up to four. Try a heavy-industry name against a technology name to see the benchmark-basis effect."
        />
        <CompanyPicker
          companies={COMPANIES.map((c) => ({
            ticker: c.ticker,
            name: c.name,
            sector: SECTORS[c.sector].short,
          }))}
          selected={selected.map((c) => c.ticker)}
        />
      </Card>

      {selected.length === 0 ? (
        <div className="mt-5">
          <Empty message="Select one or more companies above to begin." />
        </div>
      ) : (
        <div
          className="mt-5 grid gap-5"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`,
          }}
        >
          {selected.map((company) => {
            const ratings = normalisedRatingsFor(company.ticker);
            const divergence = computeDivergence(company.ticker);
            const explanation = explain(company.ticker);
            const consensus = consensusScore(company.ticker);

            return (
              <Card key={company.ticker} className="flex flex-col">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/company/${company.ticker}`}
                      className="block truncate font-display text-[15px] font-bold hover:underline"
                    >
                      {company.name}
                    </Link>
                    <div className="mt-0.5 text-[11.5px] text-subtle">
                      {company.ticker} · {SECTORS[company.sector].short}
                    </div>
                  </div>
                  <BandBadge band={divergence.band} size="sm" />
                </div>

                <div className="mb-4 flex items-baseline gap-4 rounded-xl bg-surface-2 px-3.5 py-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-subtle">
                      Divergence
                    </div>
                    <div
                      className="tnum font-display text-[23px] font-bold leading-tight"
                      style={{ color: rampColor(divergence.score) }}
                    >
                      {divergence.score.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-subtle">
                      Consensus
                    </div>
                    <div className="tnum font-display text-[23px] font-bold leading-tight">
                      {consensus?.toFixed(1) ?? "—"}
                    </div>
                  </div>
                </div>

                <NormalisedBars ratings={ratings} mode="normalised" />

                <div className="mt-4 border-t border-line pt-3.5">
                  <div className="mb-1.5 eyebrow">
                    Widest pair
                  </div>
                  {divergence.widestPair ? (
                    <p className="text-[12px] leading-relaxed text-muted">
                      {PROVIDERS[divergence.widestPair.a].shortName} vs{" "}
                      {PROVIDERS[divergence.widestPair.b].shortName} —{" "}
                      <span className="tnum font-semibold text-ink">
                        {divergence.widestPair.normalisedDelta.toFixed(1)}
                      </span>{" "}
                      points apart.
                    </p>
                  ) : (
                    <p className="text-[12px] text-subtle">Single rating only.</p>
                  )}

                  {explanation.drivers[0] && (
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">
                      <span className="font-medium text-ink">
                        Lead driver:{" "}
                      </span>
                      {explanation.drivers[0].title}.
                    </p>
                  )}
                </div>

                <Link
                  href={`/company/${company.ticker}`}
                  className="mt-auto pt-4 text-[12px] font-medium text-brand underline underline-offset-2"
                >
                  Full analysis →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
