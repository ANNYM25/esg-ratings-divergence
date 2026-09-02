import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardHeader, BandBadge } from "@/components/primitives";
import { ProvenanceBanner } from "@/components/provenance-banner";
import { SECTORS, SECTOR_IDS, companiesInSector } from "@/data/companies";
import { computeDivergence, sectorDivergence } from "@/lib/divergence";
import { normalisedRatingsFor } from "@/lib/normalise";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import { PROVIDER_COLOR, rampColor } from "@/lib/ui";
import { DownloadButton } from "@/components/download-button";

export const metadata = { title: "Sectors" };

export default function SectorsPage() {
  const summary = sectorDivergence();

  return (
    <Shell
      title="Sector view"
      subtitle="Divergence is not evenly distributed. It concentrates where the product itself is contested and where operational metrics understate downstream impact."
    >
      <ProvenanceBanner />

      <Card className="mt-5">
        <CardHeader
          title="Divergence heatmap"
          hint="Every company in the universe, grouped by sector and shaded by composite divergence score."
          action={<DownloadButton dataset="divergence" />}
        />
        <div className="scroll-x">
          <div className="min-w-[640px] space-y-4">
            {SECTOR_IDS.map((sector) => {
              const companies = companiesInSector(sector);
              return (
                <div key={sector} id={sector}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-display text-[13px] font-bold">
                      {SECTORS[sector].name}
                    </h3>
                    <span className="tnum text-[11.5px] text-subtle">
                      mean{" "}
                      {summary
                        .find((s) => s.sector === sector)
                        ?.mean.toFixed(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {companies.map((c) => {
                      const d = computeDivergence(c.ticker);
                      const color = rampColor(d.score);
                      return (
                        <Link
                          key={c.ticker}
                          href={`/company/${c.ticker}`}
                          className="group relative flex h-[74px] flex-col justify-between overflow-hidden rounded-xl p-2.5 transition-transform hover:scale-[1.03]"
                          style={{
                            background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`,
                            border: `1px solid color-mix(in oklab, ${color} 34%, transparent)`,
                          }}
                          title={`${c.name} — divergence ${d.score.toFixed(1)}`}
                        >
                          <span className="tnum mono text-[11px] font-bold">
                            {c.ticker}
                          </span>
                          <span
                            className="tnum font-display text-[20px] font-bold leading-none"
                            style={{ color }}
                          >
                            {d.score.toFixed(0)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-[11px] text-subtle">
          <span className="font-medium">Scale</span>
          {[
            { label: "Aligned 0–15", v: 8 },
            { label: "Mild 16–35", v: 25 },
            { label: "Significant 36–60", v: 48 },
            { label: "Extreme 61+", v: 80 },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ background: rampColor(s.v) }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5">
        {SECTOR_IDS.map((sector) => (
          <SectorTable key={sector} sector={sector} />
        ))}
      </div>
    </Shell>
  );
}

function SectorTable({ sector }: { sector: (typeof SECTOR_IDS)[number] }) {
  const companies = companiesInSector(sector)
    .map((c) => ({
      company: c,
      divergence: computeDivergence(c.ticker),
      ratings: normalisedRatingsFor(c.ticker),
    }))
    .sort((a, b) => b.divergence.score - a.divergence.score);

  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <CardHeader
          title={SECTORS[sector].name}
          hint="Normalised scores by provider, with the composite divergence score."
          action={<DownloadButton dataset="normalised" />}
        />
      </div>

      <div className="scroll-x">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-line bg-surface-2">
              <th className="py-2 pl-5 pr-3 text-left eyebrow">
                Company
              </th>
              {PROVIDER_IDS.map((p) => (
                <th key={p} className="py-2 pr-3 text-right">
                  <span
                    className="text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: PROVIDER_COLOR[p] }}
                  >
                    {PROVIDERS[p].shortName}
                  </span>
                </th>
              ))}
              <th className="py-2 pr-3 text-right eyebrow">
                Score
              </th>
              <th className="py-2 pr-5 text-left eyebrow">
                Band
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map(({ company, divergence, ratings }) => (
              <tr
                key={company.ticker}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="py-2.5 pl-5 pr-3">
                  <Link href={`/company/${company.ticker}`} className="group block">
                    <span className="tnum mr-2 mono text-[11.5px] font-bold text-brand">
                      {company.ticker}
                    </span>
                    <span className="text-[12.5px] group-hover:underline">
                      {company.name}
                    </span>
                  </Link>
                </td>
                {PROVIDER_IDS.map((p) => {
                  const r = ratings.find((x) => x.provider === p);
                  return (
                    <td key={p} className="tnum py-2.5 pr-3 text-right text-[12.5px]">
                      {r ? (
                        <>
                          {r.normalised.toFixed(1)}
                          <span className="ml-1 text-[10px] text-subtle">
                            {r.rawLabel?.split(" · ")[0]}
                          </span>
                        </>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 pr-3 text-right">
                  <span
                    className="tnum font-display text-[13.5px] font-bold"
                    style={{ color: rampColor(divergence.score) }}
                  >
                    {divergence.score.toFixed(1)}
                  </span>
                </td>
                <td className="py-2.5 pr-5">
                  <BandBadge band={divergence.band} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
