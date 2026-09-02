/**
 * Phase 4 — Divergence metrics.
 *
 * THE FORMULA IS PUBLISHED, NOT HIDDEN. A divergence score nobody can
 * reproduce is worth nothing to an analyst.
 *
 *   normalisedRange = max(normalised) − min(normalised)          [0–100]
 *   percentileRange = max(percentile) − min(percentile)          [0–100]
 *
 *   DivergenceScore = max(normalisedRange, percentileRange)
 *
 * The two components answer different questions. The normalised range asks
 * "how far apart are the scores?". The percentile range asks "how differently
 * do the providers *rank* this company against its peers?".
 *
 * WHY MAX AND NOT A WEIGHTED AVERAGE. An earlier version of this scored
 * 0.5 × normalisedRange + 0.5 × percentileRange. It produced a false negative
 * that is worth recording: Meta Platforms is ranked last in technology by all
 * four providers, so its percentile range is zero, while the providers sit 30
 * points apart on absolute level. The average scored that 15 and labelled it
 * "Aligned" — agreement on rank had cancelled out disagreement on level.
 *
 * Disagreement in EITHER dimension is disagreement, so the composite takes the
 * larger of the two. The components are then reported separately, and the
 * `profile` field names which kind of disagreement it is — which is more
 * informative than the single number, because "they agree on the ranking but
 * not the level" and "they cannot even agree on the ranking" are different
 * problems for an investor.
 *
 * Bands:
 *   0–15  Aligned      — providers broadly concur
 *   16–35 Mild         — ordinary methodological noise
 *   36–60 Significant  — a real disagreement worth investigating
 *   61+   Extreme      — the providers are effectively rating different things
 */

import { COMPANIES } from "@/data/companies";
import { PROVIDER_IDS } from "./providers";
import { normalisedRatingsFor, round } from "./normalise";
import type {
  DisagreementProfile,
  DivergenceBand,
  DivergenceResult,
  NormalisedRating,
  PairwiseDelta,
  Pillar,
  ProviderId,
  SectorId,
} from "./types";

export const BANDS: Record<
  DivergenceBand,
  { label: string; min: number; max: number; description: string }
> = {
  aligned: {
    label: "Aligned",
    min: 0,
    max: 15,
    description: "Providers broadly concur. Methodology differences are not biting here.",
  },
  mild: {
    label: "Mild",
    min: 16,
    max: 35,
    description: "Ordinary methodological noise. Directionally consistent.",
  },
  significant: {
    label: "Significant",
    min: 36,
    max: 60,
    description: "A real disagreement. Which rating you use changes the conclusion.",
  },
  extreme: {
    label: "Extreme",
    min: 61,
    max: 100,
    description: "The providers are effectively measuring different things.",
  },
};

export function bandFor(score: number): DivergenceBand {
  if (score <= BANDS.aligned.max) return "aligned";
  if (score <= BANDS.mild.max) return "mild";
  if (score <= BANDS.significant.max) return "significant";
  return "extreme";
}

export const PROFILES: Record<
  DisagreementProfile,
  { label: string; description: string }
> = {
  none: {
    label: "Broad agreement",
    description:
      "The providers agree on both the level and the ranking. Whichever rating you use, you reach the same conclusion.",
  },
  level: {
    label: "Level, not rank",
    description:
      "The providers place this company in the same position relative to its peers, but disagree on the absolute score. Sector-relative screening is unaffected; absolute score thresholds are not.",
  },
  rank: {
    label: "Rank, not level",
    description:
      "The providers land on similar absolute scores but order this company very differently against its peers. Best-in-class screening is affected; absolute thresholds are not.",
  },
  both: {
    label: "Level and rank",
    description:
      "The providers disagree on the score and on the peer ranking. There is no screening approach under which these ratings agree.",
  },
};

/** Which kind of disagreement this is — more informative than the score alone. */
function profileFor(
  normalisedRange: number,
  percentileRange: number,
): DisagreementProfile {
  const MATERIAL = 20;
  const level = normalisedRange >= MATERIAL;
  const rank = percentileRange >= MATERIAL;
  if (level && rank) return "both";
  if (level) return "level";
  if (rank) return "rank";
  return "none";
}

function range(values: number[]): number {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function pairwise(ratings: NormalisedRating[]): PairwiseDelta[] {
  const out: PairwiseDelta[] = [];
  for (let i = 0; i < ratings.length; i++) {
    for (let j = i + 1; j < ratings.length; j++) {
      const a = ratings[i];
      const b = ratings[j];
      out.push({
        a: a.provider,
        b: b.provider,
        normalisedDelta: round(Math.abs(a.normalised - b.normalised), 1),
        percentileDelta: round(
          Math.abs(a.universePercentile - b.universePercentile),
          1,
        ),
      });
    }
  }
  return out.sort((x, y) => y.normalisedDelta - x.normalisedDelta);
}

const PILLAR_KEYS: Pillar[] = ["environmental", "social", "governance"];

export function computeDivergence(ticker: string): DivergenceResult {
  const ratings = normalisedRatingsFor(ticker);
  const normalised = ratings.map((r) => r.normalised);
  // Rank component uses the universe percentile, not the sector one: with six
  // companies per sector the sector step is 16.7 points, which turns a
  // one-position difference into an "Extreme" score. See normalise.ts.
  const percentiles = ratings.map((r) => r.universePercentile);

  const normalisedRange = round(range(normalised), 1);
  const percentileRange = round(range(percentiles), 1);
  const score = round(Math.min(100, Math.max(normalisedRange, percentileRange)), 1);

  // Per-pillar disagreement. Aggregate scores frequently agree while the
  // pillars underneath them disagree violently — that is usually the
  // interesting finding, so it gets computed separately rather than averaged
  // away.
  const pillarRanges: Partial<Record<Pillar, number>> = {};
  for (const pillar of PILLAR_KEYS) {
    const values = ratings
      .map((r) => r.pillars?.[pillar])
      .filter((v): v is number => typeof v === "number");
    if (values.length >= 2) pillarRanges[pillar] = round(range(values), 1);
  }

  const sorted = [...ratings].sort((a, b) => b.normalised - a.normalised);

  return {
    ticker: ticker.toUpperCase(),
    score,
    band: bandFor(score),
    profile: profileFor(normalisedRange, percentileRange),
    normalisedRange,
    percentileRange,
    stdDev: round(stdDev(normalised), 1),
    pairs: pairwise(ratings),
    widestPair: pairwise(ratings)[0] ?? null,
    highest: sorted[0]
      ? { provider: sorted[0].provider, normalised: sorted[0].normalised }
      : null,
    lowest: sorted.at(-1)
      ? {
          provider: sorted.at(-1)!.provider,
          normalised: sorted.at(-1)!.normalised,
        }
      : null,
    pillarRanges,
    providerCount: ratings.length,
  };
}

/* ------------------------------------------------------------------ *
 * Universe-level analytics
 * ------------------------------------------------------------------ */

export interface UniverseRow {
  ticker: string;
  name: string;
  sector: SectorId;
  divergence: DivergenceResult;
  consensus: number;
}

let universeCache: UniverseRow[] | null = null;

export function universe(): UniverseRow[] {
  if (universeCache) return universeCache;

  universeCache = COMPANIES.map((company) => {
    const divergence = computeDivergence(company.ticker);
    const ratings = normalisedRatingsFor(company.ticker);
    const consensus =
      ratings.length > 0
        ? round(
            ratings.reduce((a, r) => a + r.normalised, 0) / ratings.length,
            1,
          )
        : 0;
    return {
      ticker: company.ticker,
      name: company.name,
      sector: company.sector,
      divergence,
      consensus,
    };
  }).sort((a, b) => b.divergence.score - a.divergence.score);

  return universeCache;
}

/**
 * Spearman rank correlation between two providers across the whole universe.
 *
 * This is the headline number in the academic literature. Berg, Kölbel &
 * Rigobon (2022) report pairwise correlations of roughly 0.38–0.71 across six
 * major raters. Reproducing that range on your own universe is the single most
 * quotable output this tool produces.
 */
export function spearman(a: ProviderId, b: ProviderId): number {
  const paired = COMPANIES.map((c) => {
    const ratings = normalisedRatingsFor(c.ticker);
    const ra = ratings.find((r) => r.provider === a);
    const rb = ratings.find((r) => r.provider === b);
    return ra && rb ? { a: ra.normalised, b: rb.normalised } : null;
  }).filter((x): x is { a: number; b: number } => x !== null);

  if (paired.length < 3) return 0;

  const rank = (values: number[]): number[] => {
    const indexed = values.map((v, i) => ({ v, i }));
    indexed.sort((x, y) => x.v - y.v);
    const ranks = new Array<number>(values.length);
    let i = 0;
    while (i < indexed.length) {
      let j = i;
      while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
      // Ties share the average of the ranks they span.
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg;
      i = j + 1;
    }
    return ranks;
  };

  const ra = rank(paired.map((p) => p.a));
  const rb = rank(paired.map((p) => p.b));
  const n = ra.length;

  const meanA = ra.reduce((x, y) => x + y, 0) / n;
  const meanB = rb.reduce((x, y) => x + y, 0) / n;

  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = ra[i] - meanA;
    const db = rb[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denom = Math.sqrt(denomA * denomB);
  return denom === 0 ? 0 : round(num / denom, 2);
}

export function correlationMatrix(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of PROVIDER_IDS) {
    for (const b of PROVIDER_IDS) {
      out[`${a}:${b}`] = a === b ? 1 : spearman(a, b);
    }
  }
  return out;
}

export function sectorDivergence(): Array<{
  sector: SectorId;
  mean: number;
  max: number;
  count: number;
}> {
  const rows = universe();
  const sectors = [...new Set(rows.map((r) => r.sector))];

  return sectors
    .map((sector) => {
      const inSector = rows.filter((r) => r.sector === sector);
      const scores = inSector.map((r) => r.divergence.score);
      return {
        sector,
        mean: round(scores.reduce((a, b) => a + b, 0) / scores.length, 1),
        max: round(Math.max(...scores), 1),
        count: inSector.length,
      };
    })
    .sort((a, b) => b.mean - a.mean);
}

export function universeStats() {
  const rows = universe();
  const scores = rows.map((r) => r.divergence.score);
  const counts: Record<DivergenceBand, number> = {
    aligned: 0,
    mild: 0,
    significant: 0,
    extreme: 0,
  };
  for (const row of rows) counts[row.divergence.band]++;

  return {
    companies: rows.length,
    providers: PROVIDER_IDS.length,
    meanDivergence: round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
      1,
    ),
    maxDivergence: round(Math.max(...scores), 1),
    mostDivergent: rows[0],
    counts,
    /** Share of the universe where the rating you pick changes the answer. */
    materialShare: round(
      ((counts.significant + counts.extreme) / rows.length) * 100,
      0,
    ),
  };
}
