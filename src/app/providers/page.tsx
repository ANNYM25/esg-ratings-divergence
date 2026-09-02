import { Shell } from "@/components/shell";
import { Card, CardHeader } from "@/components/primitives";
import { MethodologyDiff } from "@/components/explanation";
import { PROVIDER_LIST, PROVIDER_IDS, label } from "@/lib/providers";
import { PROVIDER_COLOR } from "@/lib/ui";
import { DownloadButton } from "@/components/download-button";

export const metadata = { title: "Providers" };

export default function ProvidersPage() {
  return (
    <Shell
      title="The four raters"
      subtitle="Read these side by side and the divergence stops being mysterious. They are not four attempts at the same measurement — they are four different measurements."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {PROVIDER_LIST.map((p) => (
          <Card key={p.id} className="relative overflow-hidden">
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: PROVIDER_COLOR[p.id] }}
            />

            <div className="mb-3">
              <h2
                className="font-display text-[18px] font-bold tracking-tight"
                style={{ color: PROVIDER_COLOR[p.id] }}
              >
                {p.name}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-subtle">{p.owner}</p>
            </div>

            <p className="text-[13px] leading-relaxed text-muted">
              {p.selfDescription}
            </p>

            <div className="mt-4 rounded-xl bg-surface-2 p-3.5">
              <div className="eyebrow">
                Scale
              </div>
              <div className="mt-1 text-[13px] font-medium">{p.scale.unit}</div>
              {p.scale.direction === "lower_better" && (
                <div
                  className="mt-2 text-[11.5px] font-medium"
                  style={{ color: "var(--warn)" }}
                >
                  Note: lower is better. This is a risk score, not a performance
                  score — the most commonly misread fact in ESG data.
                </div>
              )}
              {p.scale.buckets && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {p.scale.buckets.map((b) => (
                    <span
                      key={b.label}
                      className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted"
                      title={`${b.min}–${b.max}`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2 text-[12.5px]">
              <Row k="What it measures" v={label(p.framing)} />
              <Row k="Benchmark basis" v={label(p.benchmark)} />
              <Row k="Materiality lens" v={label(p.materiality)} />
              <Row k="Non-disclosure" v={label(p.disclosure)} />
              <Row k="Controversies" v={label(p.controversy)} />
              <Row k="Update cadence" v={label(p.cadence)} />
            </dl>

            <div className="mt-4">
              <div className="mb-1.5 eyebrow">
                Input mix
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  style={{
                    width: `${p.dataMix.selfReported}%`,
                    background: PROVIDER_COLOR[p.id],
                  }}
                  title={`Company-reported ${p.dataMix.selfReported}%`}
                />
                <div
                  style={{
                    width: `${p.dataMix.mediaAndNgo}%`,
                    background: PROVIDER_COLOR[p.id],
                    opacity: 0.55,
                  }}
                  title={`Media and NGO ${p.dataMix.mediaAndNgo}%`}
                />
                <div
                  style={{
                    width: `${p.dataMix.modelled}%`,
                    background: PROVIDER_COLOR[p.id],
                    opacity: 0.25,
                  }}
                  title={`Modelled ${p.dataMix.modelled}%`}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-subtle">
                <span>Reported {p.dataMix.selfReported}%</span>
                <span>Media/NGO {p.dataMix.mediaAndNgo}%</span>
                <span>Modelled {p.dataMix.modelled}%</span>
              </div>
            </div>

            <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              <span className="font-medium text-ink">Weighting. </span>
              {p.weighting}
            </p>

            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-[11.5px] font-medium text-brand underline underline-offset-2"
            >
              Published methodology →
            </a>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Full methodology diff"
          hint="All four providers, every attribute. Highlighted rows are where they disagree — these are the rows that generate divergence."
          action={<DownloadButton dataset="methodology" />}
        />
        <MethodologyDiff providers={PROVIDER_IDS} />
      </Card>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
      <dt className="shrink-0 text-subtle">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
