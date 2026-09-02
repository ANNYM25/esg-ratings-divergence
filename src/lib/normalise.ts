/**
 * Phase 3 — Normalisation engine.
 *
 * Converts four mutually incommensurable provider scales onto one common
 * 0–100 axis where higher is always better, and computes sector percentiles.
 *
 * Three decisions here carry the whole tool's credibility:
 *
 *  1. SUSTAINALYTICS IS INVERTED, NOT TRANSLATED. Its raw number is unmanaged
 *     risk, so lower is better. We map it to 100 − (risk / practicalMax) × 100.
 *     The practical maximum is 50, not the theoretical 100, because essentially
 *     no rated company exceeds 50 and normalising against 100 would squash
 *     every real company into the top half of the axis.
 *
 *  2. MSCI LETTERS ARE INTERVALS, NOT POINTS. "AA" is a range on the
 *     underlying 0–10 score, so every MSCI value carries an uncertainty band
 *     equal to the width of its bucket. The UI renders that band. Treating a
 *     letter grade as a point estimate is the most common error in ESG
 *     comparison work and it manufactures precision that does not exist.
 *
 *  3. THE NORMALISED SCALE IS THE WEAKER VIEW. Comparing an industry-relative
 *     rating to an absolute one on a raw axis is apples-to-oranges by
 *     construction. SECTOR PERCENTILE is the honest common ground and is the
 *     application's default view. Normalised score is the toggle.
 *
 * Nothing in this file is probabilistic and nothing calls an LLM.
 */

import { COMPANIES, getCompany } from "@/data/companies";
import { RATINGS, ratingsFor } from "@/data/ratings";
import { PROVIDERS, bucketFor } from "./providers";
import type {
  NormalisedRating,
  Pillar,
  ProviderId,
  RatingRecord,
} from "./types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/**
 * Map a raw score on a provider's native scale to the common 0–100
 * higher-is-better axis.
 */
export function toCommonScale(provider: ProviderId, raw: number): number {
  const { scale } = PROVIDERS[provider];
  const ceiling = scale.practicalMax ?? scale.max;
  const span = ceiling - scale.min;
  if (span <= 0) return 0;

  const position = (clamp(raw, scale.min, ceiling) - scale.min) / span;
  const oriented =
    scale.direction === "lower_better" ? 1 - position : position;

  return round(clamp(oriented * 100), 1);
}

/**
 * Uncertainty interval on the common scale.
 *
 * Bucketed scales inherit the full width of their bucket. Continuous scales
 * get a small symmetric band reflecting the fact that a published integer
 * score is itself a rounded quantity — never zero, because implying a score
 * is exact to the decimal would be its own kind of false precision.
 */
export function uncertaintyBand(
  provider: ProviderId,
  raw: number,
): { low: number; high: number } {
  const bucket = bucketFor(provider, raw);
  const point = toCommonScale(provider, raw);

  if (bucket) {
    const a = toCommonScale(provider, bucket.min);
    const b = toCommonScale(provider, bucket.max);
    return { low: round(Math.min(a, b), 1), high: round(Math.max(a, b), 1) };
  }

  const nominal = 2.5;
  return {
    low: round(clamp(point - nominal), 1),
    high: round(clamp(point + nominal), 1),
  };
}

/** Native display label — the provider's own words, not ours. */
export function nativeLabel(provider: ProviderId, raw: number): string {
  const p = PROVIDERS[provider];
  const bucket = bucketFor(provider, raw);

  switch (provider) {
    case "msci":
      return bucket?.label ?? raw.toFixed(1);
    case "sustainalytics":
      return `${raw.toFixed(1)}${bucket ? ` · ${bucket.label}` : ""}`;
    case "lseg":
      return `${Math.round(raw)}${bucket ? ` · ${bucket.label}` : ""}`;
    default:
      return `${Math.round(raw)}/${p.scale.max}`;
  }
}

/* ------------------------------------------------------------------ *
 * Sector percentiles
 * ------------------------------------------------------------------ */

/**
 * Percentile rank of a company within its own sector, per provider.
 *
 * Uses the midpoint ("fractional") method so tied scores share a rank rather
 * than one arbitrarily beating the other.
 */
function buildPercentileIndex(): Map<string, number> {
  const index = new Map<string, number>();

  for (const sector of new Set(COMPANIES.map((c) => c.sector))) {
    const tickers = COMPANIES.filter((c) => c.sector === sector).map(
      (c) => c.ticker,
    );

    for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
      const scored = RATINGS.filter(
        (r) => r.provider === provider && tickers.includes(r.ticker),
      ).map((r) => ({
        ticker: r.ticker,
        value: toCommonScale(provider, r.rawScore),
      }));

      if (scored.length === 0) continue;

      for (const item of scored) {
        const below = scored.filter((o) => o.value < item.value).length;
        const equal = scored.filter((o) => o.value === item.value).length;
        const percentile =
          ((below + equal / 2) / scored.length) * 100;
        index.set(`${item.ticker}:${provider}`, round(percentile, 1));
      }
    }
  }

  return index;
}

const PERCENTILES = buildPercentileIndex();

export function sectorPercentile(
  ticker: string,
  provider: ProviderId,
): number {
  return PERCENTILES.get(`${ticker.toUpperCase()}:${provider}`) ?? 0;
}

/**
 * Percentile against the WHOLE universe rather than the six-company sector.
 *
 * Why both exist. Sector percentile is the analytically correct comparison —
 * it is what an industry-relative rater is actually claiming — so it stays the
 * display metric. But with six companies per sector the finest possible step is
 * 16.7 points, which means a single rank position swings the number enormously.
 * Visa scored 83.4 "Extreme" largely because two raters placed it one or two
 * positions apart inside a six-name group.
 *
 * That is a small-sample artefact presented as a finding, which is exactly the
 * kind of thing that discredits an analysis. The universe percentile has a
 * 3.3-point step, so the divergence score's rank component is computed from it
 * instead. Widening the universe would remove the need for this; until then,
 * this is the honest choice.
 */
function buildUniversePercentileIndex(): Map<string, number> {
  const index = new Map<string, number>();

  for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
    const scored = RATINGS.filter((r) => r.provider === provider).map((r) => ({
      ticker: r.ticker,
      value: toCommonScale(provider, r.rawScore),
    }));
    if (scored.length === 0) continue;

    for (const item of scored) {
      const below = scored.filter((o) => o.value < item.value).length;
      const equal = scored.filter((o) => o.value === item.value).length;
      index.set(
        `${item.ticker}:${provider}`,
        round(((below + equal / 2) / scored.length) * 100, 1),
      );
    }
  }

  return index;
}

const UNIVERSE_PERCENTILES = buildUniversePercentileIndex();

export function universePercentile(
  ticker: string,
  provider: ProviderId,
): number {
  return UNIVERSE_PERCENTILES.get(`${ticker.toUpperCase()}:${provider}`) ?? 0;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export function normaliseRecord(record: RatingRecord): NormalisedRating {
  const normalised = toCommonScale(record.provider, record.rawScore);

  let pillars: Record<Pillar, number> | undefined;
  if (record.pillars) {
    pillars = {
      environmental: toCommonScale(
        record.provider,
        record.pillars.environmental,
      ),
      social: toCommonScale(record.provider, record.pillars.social),
      governance: toCommonScale(record.provider, record.pillars.governance),
    };
  }

  return {
    provider: record.provider,
    raw: record.rawScore,
    rawLabel: nativeLabel(record.provider, record.rawScore),
    normalised,
    band: uncertaintyBand(record.provider, record.rawScore),
    sectorPercentile: sectorPercentile(record.ticker, record.provider),
    universePercentile: universePercentile(record.ticker, record.provider),
    pillars,
    provenance: record.provenance,
    verified: record.verified,
    asOf: record.asOf,
  };
}

/**
 * Every normalised rating for one company, in a stable provider order.
 * Missing providers are simply absent — never zero-filled. A company nobody
 * rates is a fact to display, not a gap to paper over.
 */
export function normalisedRatingsFor(ticker: string): NormalisedRating[] {
  const order = Object.keys(PROVIDERS) as ProviderId[];
  return ratingsFor(ticker)
    .map(normaliseRecord)
    .sort((a, b) => order.indexOf(a.provider) - order.indexOf(b.provider));
}

/** Sector median on the common scale, used as the reference line in charts. */
export function sectorMedian(ticker: string): number | null {
  const company = getCompany(ticker);
  if (!company) return null;

  const peers = COMPANIES.filter((c) => c.sector === company.sector).map(
    (c) => c.ticker,
  );

  const values = RATINGS.filter((r) => peers.includes(r.ticker)).map((r) =>
    toCommonScale(r.provider, r.rawScore),
  );

  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  return round(median, 1);
}

/** Consensus view: the mean of available normalised scores. */
export function consensusScore(ticker: string): number | null {
  const ratings = normalisedRatingsFor(ticker);
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.normalised, 0);
  return round(sum / ratings.length, 1);
}
