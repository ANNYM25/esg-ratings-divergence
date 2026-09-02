import { PROVIDERS, label } from "@/lib/providers";
import { CATEGORY_LABELS, LITERATURE_ATTRIBUTION } from "@/lib/explain";
import { PROVIDER_COLOR } from "@/lib/ui";
import type {
  DivergenceCategory,
  Explanation,
  NormalisedRating,
  ProviderId,
  ProviderProfile,
} from "@/lib/types";

const CATEGORY_COLOR: Record<DivergenceCategory, string> = {
  scope: "var(--provider-msci)",
  measurement: "var(--provider-lseg)",
  weight: "var(--provider-spcsa)",
};

/* ------------------------------------------------------------------ *
 * Head-to-head: what each provider is actually claiming
 * ------------------------------------------------------------------ */

export function HeadToHead({
  pair,
  ratings,
}: {
  pair: ProviderId[];
  ratings: NormalisedRating[];
}) {
  const entries = pair
    .map((id) => ({ profile: PROVIDERS[id], rating: ratings.find((r) => r.provider === id) }))
    .filter((e): e is { profile: ProviderProfile; rating: NormalisedRating } =>
      Boolean(e.rating),
    )
    .sort((a, b) => b.rating.normalised - a.rating.normalised);

  if (entries.length < 2) return null;

  const gap = entries[0].rating.normalised - entries[1].rating.normalised;

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
      {entries.map((e, i) => (
        <div key={e.profile.id} className="contents">
          <div
            className="rounded-2xl p-4"
            style={{
              background: `color-mix(in oklab, ${PROVIDER_COLOR[e.profile.id]} 6%, var(--surface))`,
              border: `1px solid color-mix(in oklab, ${PROVIDER_COLOR[e.profile.id]} 22%, transparent)`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-display text-[13px] font-bold"
                style={{ color: PROVIDER_COLOR[e.profile.id] }}
              >
                {e.profile.shortName}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{
                  background: i === 0 ? "var(--brand-100)" : "var(--surface-3)",
                  color: i === 0 ? "var(--brand-800)" : "var(--text-muted)",
                }}
              >
                {i === 0 ? "Rates higher" : "Rates lower"}
              </span>
            </div>

            <div
              className="tnum mt-2.5 font-display text-[26px] font-bold leading-none"
              style={{ color: PROVIDER_COLOR[e.profile.id] }}
            >
              {e.rating.rawLabel}
            </div>
            <div className="mt-1 text-[10.5px] text-subtle">
              {e.rating.normalised.toFixed(1)} on the common scale
            </div>

            <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Its claim: </span>
              {e.profile.selfDescription}
            </p>
          </div>

          {i === 0 && (
            <div className="flex items-center justify-center py-1 sm:flex-col sm:py-0">
              <div className="flex flex-col items-center">
                <span className="eyebrow">Gap</span>
                <span className="tnum font-display text-[22px] font-bold leading-tight">
                  {gap.toFixed(1)}
                </span>
                <span className="text-[10px] text-subtle">points</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Reasons — always visible, never collapsed
 * ------------------------------------------------------------------ */

export function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const { summary, drivers, attribution } = explanation;
  const maxWeight = Math.max(...drivers.map((d) => d.weight), 1);

  return (
    <div>
      <p className="rounded-2xl bg-surface-2 p-4 text-[14px] font-medium leading-relaxed">
        {summary}
      </p>

      <AttributionBar attribution={attribution} />

      <div className="mt-5">
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[13px] font-bold">
            The {drivers.length} reasons they disagree
          </h3>
          <span className="text-[10.5px] text-subtle">ranked by contribution</span>
        </div>

        <ol className="space-y-3">
          {drivers.map((d, i) => (
            <li
              key={d.id}
              className="print-avoid-break relative overflow-hidden rounded-2xl border border-line bg-surface p-4"
            >
              <span
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: CATEGORY_COLOR[d.category] }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="tnum font-display text-[11px] font-bold text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                  style={{
                    background: `color-mix(in oklab, ${CATEGORY_COLOR[d.category]} 13%, transparent)`,
                    color: CATEGORY_COLOR[d.category],
                  }}
                >
                  {CATEGORY_LABELS[d.category].label}
                </span>
                <span className="text-[10.5px] text-subtle">{d.attribute}</span>

                <span className="ml-auto flex items-center gap-2">
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-3 sm:block">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(d.weight / maxWeight) * 100}%`,
                        background: CATEGORY_COLOR[d.category],
                      }}
                    />
                  </span>
                  <span className="tnum text-[11px] font-bold text-muted">{d.weight}</span>
                </span>
              </div>

              <h4 className="mt-2 font-display text-[14.5px] font-bold leading-snug">
                {d.title}
              </h4>

              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{d.detail}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[11px]">
                {d.favours && (
                  <span>
                    <span className="text-subtle">Pushes upward: </span>
                    <span
                      className="font-bold"
                      style={{ color: PROVIDER_COLOR[d.favours] }}
                    >
                      {PROVIDERS[d.favours].shortName}
                    </span>
                  </span>
                )}
                <span>
                  <span className="text-subtle">Confidence: </span>
                  <span className="font-semibold capitalize">{d.confidence}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 rounded-xl bg-surface-2 px-3.5 py-3 text-[11px] leading-relaxed text-subtle">
        Every reason above is produced deterministically by diffing the two
        providers&rsquo; published methodology profiles against this company&rsquo;s own
        attributes. No language model was involved, and each claim traces back to a
        named attribute in the methodology table below.
      </p>
    </div>
  );
}

function AttributionBar({
  attribution,
}: {
  attribution: Record<DivergenceCategory, number>;
}) {
  const order: DivergenceCategory[] = ["measurement", "scope", "weight"];
  const total = order.reduce((a, k) => a + attribution[k], 0);
  if (total === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[12.5px] font-bold">
          Divergence attribution
        </span>
        <span className="text-[10.5px] text-subtle">
          decomposition after Berg, Kölbel &amp; Rigobon (2022)
        </span>
      </div>

      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {order.map((k) =>
          attribution[k] > 0 ? (
            <div
              key={k}
              className="first:rounded-l-full last:rounded-r-full"
              style={{ width: `${attribution[k]}%`, background: CATEGORY_COLOR[k] }}
              title={`${CATEGORY_LABELS[k].label}: ${attribution[k]}%`}
            />
          ) : null,
        )}
      </div>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
        {order.map((k) => (
          <div key={k}>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CATEGORY_COLOR[k] }}
              />
              <span className="text-[11.5px] font-semibold">
                {CATEGORY_LABELS[k].label}
              </span>
              <span className="tnum ml-auto font-display text-[12.5px] font-bold">
                {attribution[k]}%
              </span>
            </div>
            <div className="mt-1 pl-3.5 text-[10.5px] leading-snug text-subtle">
              {CATEGORY_LABELS[k].description}
              <br />
              <span className="opacity-75">
                Literature average: {LITERATURE_ATTRIBUTION[k]}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Methodology diff table
 * ------------------------------------------------------------------ */

const ATTRIBUTES: Array<{
  key: string;
  label: string;
  get: (p: ProviderProfile) => string;
}> = [
  { key: "framing", label: "What it measures", get: (p) => label(p.framing) },
  { key: "benchmark", label: "Benchmark basis", get: (p) => label(p.benchmark) },
  { key: "direction", label: "Scale direction", get: (p) => label(p.scale.direction) },
  { key: "materiality", label: "Materiality lens", get: (p) => label(p.materiality) },
  { key: "disclosure", label: "Non-disclosure", get: (p) => label(p.disclosure) },
  { key: "controversy", label: "Controversies", get: (p) => label(p.controversy) },
  { key: "cadence", label: "Update cadence", get: (p) => label(p.cadence) },
  {
    key: "selfReported",
    label: "Company-reported inputs",
    get: (p) => `${p.dataMix.selfReported}%`,
  },
];

export function MethodologyDiff({ providers }: { providers: ProviderId[] }) {
  const profiles = providers.map((id) => PROVIDERS[id]);

  return (
    <div className="scroll-x -mx-1 px-1">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="w-[170px] pb-2.5 text-left">
              <span className="eyebrow">Attribute</span>
            </th>
            {profiles.map((p) => (
              <th key={p.id} className="pb-2.5 text-left">
                <span
                  className="font-display text-[12px] font-bold"
                  style={{ color: PROVIDER_COLOR[p.id] }}
                >
                  {p.shortName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attr) => {
            const values = profiles.map((p) => attr.get(p));
            // Highlight the rows where the providers actually disagree — those
            // are the rows that generate divergence.
            const differs = new Set(values).size > 1;

            return (
              <tr
                key={attr.key}
                className="border-t border-line"
                style={differs ? { background: "var(--surface-2)" } : undefined}
              >
                <td className="py-2.5 pr-3 align-top">
                  <span className="flex items-start gap-1.5">
                    {differs && (
                      <span
                        className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--div-significant)" }}
                        title="Providers differ on this attribute"
                      />
                    )}
                    <span className={differs ? "font-semibold" : "text-muted"}>
                      {attr.label}
                    </span>
                  </span>
                </td>
                {values.map((v, i) => (
                  <td
                    key={profiles[i].id}
                    className={`py-2.5 pr-3 align-top ${differs ? "font-medium" : "text-muted"}`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] text-subtle">
        Highlighted rows are attributes where the providers diverge. Every reason the
        engine gives traces back to one of these rows.
      </p>
    </div>
  );
}
