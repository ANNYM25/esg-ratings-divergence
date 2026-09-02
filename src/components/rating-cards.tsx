import { PROVIDERS, label } from "@/lib/providers";
import { PROVIDER_COLOR } from "@/lib/ui";
import type { NormalisedRating } from "@/lib/types";

/**
 * Provider rating card.
 *
 * The provider's NATIVE rating is the hero — an analyst thinks in "AA" and
 * "22.4 Medium Risk", not in our normalised number. The common-scale value is
 * secondary and explicitly labelled as ours, so nobody mistakes a derived
 * figure for a published one.
 */
export function ProviderRatingCard({ rating }: { rating: NormalisedRating }) {
  const profile = PROVIDERS[rating.provider];
  const color = PROVIDER_COLOR[rating.provider];
  const bandWidth = rating.band.high - rating.band.low;

  return (
    <div className="print-avoid-break relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-4"
      style={{ boxShadow: "var(--shadow-sm)" }}>
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-[12.5px] font-bold">
            {profile.shortName}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-subtle">
            {profile.owner}
          </div>
        </div>
        {!rating.verified && (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide"
            style={{
              background: "var(--warn-soft)",
              color: "var(--warn)",
            }}
            title="Illustrative placeholder — not a published rating"
          >
            Unverified
          </span>
        )}
      </div>

      <div className="mt-3.5">
        <div
          className="tnum font-display text-[28px] font-bold leading-none tracking-tight"
          style={{ color }}
        >
          {rating.rawLabel}
        </div>
        <div className="mt-1.5 text-[10.5px] leading-snug text-subtle">
          {profile.scale.unit}
        </div>
      </div>

      <div className="mt-3.5 space-y-1.5 border-t border-line pt-3 text-[11px]">
        <Row
          k="Common scale"
          v={
            <span className="tnum">
              {rating.normalised.toFixed(1)}
              {bandWidth > 1 && (
                <span className="ml-1 text-subtle">
                  ({rating.band.low.toFixed(0)}–{rating.band.high.toFixed(0)})
                </span>
              )}
            </span>
          }
        />
        <Row
          k="Sector percentile"
          v={<span className="tnum">{rating.sectorPercentile.toFixed(0)}</span>}
        />
        <Row k="Basis" v={label(profile.benchmark)} />
        <Row k="As of" v={rating.asOf} />
      </div>

      {profile.scale.direction === "lower_better" && (
        <div
          className="mt-3 rounded-lg px-2 py-1.5 text-[10px] font-medium leading-snug"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          Lower is better on this scale — it measures risk, not performance.
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-subtle">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
