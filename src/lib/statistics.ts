/**
 * Statistical inference.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS
 *
 * Everything upstream of this file is descriptive: it reports that 48% of
 * holdings are contested and that mean divergence is 42.9. Neither number
 * means anything on its own. The obvious questions are:
 *
 *   1. How precise is it?     → bootstrap confidence intervals
 *   2. Is it more than noise? → permutation null model
 *   3. Does it survive my     → threshold sensitivity curves
 *      threshold choices?
 *
 * A finding without an error bar is an anecdote. This module supplies the
 * error bars.
 *
 * Everything here is deterministic: the PRNG is seeded, so the same dataset
 * always produces the same intervals and the same p-values. Statistics you
 * cannot reproduce are worse than no statistics.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { COMPANIES } from "@/data/companies";
import { RATINGS } from "@/data/ratings";
import { PROVIDER_IDS, PROVIDERS } from "./providers";
import { toCommonScale, round } from "./normalise";
import { computeDivergence, universe } from "./divergence";
import type { ProviderId } from "./types";

/* ------------------------------------------------------------------ *
 * Deterministic PRNG
 * ------------------------------------------------------------------ */

function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260822;
const DEFAULT_ITERATIONS = 2000;

/* ------------------------------------------------------------------ *
 * Bootstrap
 * ------------------------------------------------------------------ */

export interface Interval {
  estimate: number;
  low: number;
  high: number;
  /** Half-width of the interval — the "± x" a reader actually wants. */
  margin: number;
  iterations: number;
}

function percentileOf(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Non-parametric bootstrap: resample companies with replacement and recompute.
 *
 * Chosen over a parametric interval because divergence scores are bounded,
 * skewed and definitely not normal — a mean ± 1.96σ interval would understate
 * the tail and could produce a lower bound below zero.
 */
export function bootstrap(
  values: number[],
  statistic: (sample: number[]) => number = mean,
  iterations = DEFAULT_ITERATIONS,
  seed = SEED,
): Interval {
  const rng = makeRng(seed);
  const n = values.length;
  const draws: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const sample = new Array<number>(n);
    for (let j = 0; j < n; j++) sample[j] = values[Math.floor(rng() * n)];
    draws.push(statistic(sample));
  }

  draws.sort((a, b) => a - b);
  const estimate = statistic(values);
  const low = percentileOf(draws, 0.025);
  const high = percentileOf(draws, 0.975);

  return {
    estimate: round(estimate, 1),
    low: round(low, 1),
    high: round(high, 1),
    margin: round((high - low) / 2, 1),
    iterations,
  };
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/* ------------------------------------------------------------------ *
 * Permutation null
 * ------------------------------------------------------------------ */

export interface NullTest {
  observed: number;
  /** Mean of the statistic under the null. */
  nullMean: number;
  nullLow: number;
  nullHigh: number;
  /** Share of null draws at least as extreme as the observed value. */
  pValue: number;
  iterations: number;
  interpretation: string;
}

/**
 * How much do the raters actually agree, relative to raters who share nothing?
 *
 * The null is constructed by shuffling each provider's scores independently
 * across companies. That destroys any shared signal while preserving each
 * provider's own distribution exactly — so the null answers "what would
 * divergence look like if four raters with these scoring habits were assessing
 * companies at random?"
 *
 * This is the number that makes 42.9 mean something. On its own it could be
 * enormous or trivial; against a null of ~60 it says the raters genuinely are
 * measuring a shared underlying thing, and the residual gap is what is left
 * after that agreement is accounted for.
 */
export function permutationNullDivergence(
  iterations = 500,
  seed = SEED,
): NullTest {
  const rng = makeRng(seed);
  const tickers = COMPANIES.map((c) => c.ticker);

  // Each provider's observed scores on the common scale.
  const byProvider = Object.fromEntries(
    PROVIDER_IDS.map((p) => [
      p,
      tickers.map((t) => {
        const r = RATINGS.find((x) => x.ticker === t && x.provider === p);
        return r ? toCommonScale(p, r.rawScore) : null;
      }),
    ]),
  ) as Record<ProviderId, Array<number | null>>;

  const observed = mean(universe().map((r) => r.divergence.score));

  const draws: number[] = [];
  for (let iter = 0; iter < iterations; iter++) {
    // Independently permute each provider's scores.
    const shuffled = Object.fromEntries(
      PROVIDER_IDS.map((p) => {
        const arr = [...byProvider[p]];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return [p, arr];
      }),
    ) as Record<ProviderId, Array<number | null>>;

    // Recompute the SAME statistic the observed value uses:
    // max(level spread, rank spread). An earlier version compared the observed
    // max() against a level-only null, which is not a like-for-like comparison
    // and produced a meaningless p-value of 1.
    //
    // Percentiles have to be recomputed from the permuted scores. Permuting is
    // a relabelling, so each provider's set of percentiles is unchanged — but
    // which company holds which percentile is now random, which is exactly the
    // null being tested.
    const pctByProvider = Object.fromEntries(
      PROVIDER_IDS.map((p) => {
        const vals = shuffled[p];
        const present = vals.filter((v): v is number => v !== null);
        return [
          p,
          vals.map((v) => {
            if (v === null) return null;
            const below = present.filter((o) => o < v).length;
            const equal = present.filter((o) => o === v).length;
            return ((below + equal / 2) / present.length) * 100;
          }),
        ];
      }),
    ) as Record<ProviderId, Array<number | null>>;

    const scores: number[] = [];
    for (let i = 0; i < tickers.length; i++) {
      const levels = PROVIDER_IDS.map((p) => shuffled[p][i]).filter(
        (v): v is number => v !== null,
      );
      const ranks = PROVIDER_IDS.map((p) => pctByProvider[p][i]).filter(
        (v): v is number => v !== null,
      );
      if (levels.length < 2) continue;

      const levelSpread = Math.max(...levels) - Math.min(...levels);
      const rankSpread = Math.max(...ranks) - Math.min(...ranks);
      scores.push(Math.max(levelSpread, rankSpread));
    }
    draws.push(mean(scores));
  }

  draws.sort((a, b) => a - b);
  const nullMean = mean(draws);
  // One-sided: how often is the null AS LOW AS what we observed?
  const atLeastAsExtreme = draws.filter((d) => d <= observed).length;
  const pValue = atLeastAsExtreme / draws.length;

  return {
    observed: round(observed, 1),
    nullMean: round(nullMean, 1),
    nullLow: round(percentileOf(draws, 0.025), 1),
    nullHigh: round(percentileOf(draws, 0.975), 1),
    pValue: round(pValue, 4),
    iterations,
    interpretation:
      observed < percentileOf(draws, 0.025)
        ? "The raters agree significantly more than independent raters would. They are measuring a shared underlying construct — but the divergence that remains is still economically material."
        : "Observed divergence is not distinguishable from what unrelated raters would produce, which would suggest the raters share little common signal.",
  };
}

/* ------------------------------------------------------------------ *
 * Threshold sensitivity
 * ------------------------------------------------------------------ */

export interface SensitivityPoint {
  threshold: number;
  contestedShare: number;
}

/**
 * Does the headline finding depend on where the screen threshold was drawn?
 *
 * A result that only holds at exactly the top quartile is a result about the
 * quartile, not about the raters. Sweeping the threshold is the cheapest
 * possible robustness check and the first thing a sceptical reader will
 * reach for.
 */
export function thresholdSensitivity(
  from = 10,
  to = 50,
  step = 5,
): SensitivityPoint[] {
  const out: SensitivityPoint[] = [];

  for (let cutoff = from; cutoff <= to; cutoff += step) {
    // Include the top `cutoff`% of the universe.
    const keepAbove = 100 - cutoff;
    let contested = 0;

    for (const c of COMPANIES) {
      const verdicts = PROVIDER_IDS.map((p) => {
        const r = RATINGS.find((x) => x.ticker === c.ticker && x.provider === p);
        if (!r) return null;
        const value = toCommonScale(p, r.rawScore);
        const below = RATINGS.filter(
          (x) => x.provider === p && toCommonScale(p, x.rawScore) < value,
        ).length;
        const pct = (below / COMPANIES.length) * 100;
        return pct >= keepAbove;
      }).filter((v): v is boolean => v !== null);

      if (verdicts.some(Boolean) && verdicts.some((v) => !v)) contested++;
    }

    out.push({
      threshold: cutoff,
      contestedShare: round((contested / COMPANIES.length) * 100, 0),
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Headline figures, with intervals
 * ------------------------------------------------------------------ */

export interface InferenceSummary {
  meanDivergence: Interval;
  levelSpread: Interval;
  rankSpread: Interval;
  nullTest: NullTest;
  sensitivity: SensitivityPoint[];
  sensitivityRange: { min: number; max: number };
  correlationInterval: Interval;
  sampleSize: number;
}

export function inferenceSummary(): InferenceSummary {
  const rows = universe();
  const scores = rows.map((r) => r.divergence.score);
  const levels = rows.map((r) => r.divergence.normalisedRange);
  const ranks = rows.map((r) => r.divergence.percentileRange);

  const sensitivity = thresholdSensitivity();
  const shares = sensitivity.map((s) => s.contestedShare);

  // Bootstrap the mean pairwise correlation too — a single point estimate of
  // "0.41-0.61" invites the question of how stable those endpoints are.
  const rhos: number[] = [];
  for (let i = 0; i < PROVIDER_IDS.length; i++) {
    for (let j = i + 1; j < PROVIDER_IDS.length; j++) {
      const a = PROVIDER_IDS[i];
      const b = PROVIDER_IDS[j];
      rhos.push(spearmanFor(a, b));
    }
  }

  return {
    meanDivergence: bootstrap(scores),
    levelSpread: bootstrap(levels),
    rankSpread: bootstrap(ranks),
    nullTest: permutationNullDivergence(),
    sensitivity,
    sensitivityRange: { min: Math.min(...shares), max: Math.max(...shares) },
    correlationInterval: bootstrap(rhos, mean, 2000),
    sampleSize: rows.length,
  };
}

/** Spearman between two providers on the common scale. */
function spearmanFor(a: ProviderId, b: ProviderId): number {
  const paired = COMPANIES.map((c) => {
    const ra = RATINGS.find((x) => x.ticker === c.ticker && x.provider === a);
    const rb = RATINGS.find((x) => x.ticker === c.ticker && x.provider === b);
    return ra && rb
      ? { a: toCommonScale(a, ra.rawScore), b: toCommonScale(b, rb.rawScore) }
      : null;
  }).filter((x): x is { a: number; b: number } => x !== null);

  const rank = (xs: number[]) => {
    const idx = xs.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v);
    const r = new Array<number>(xs.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k].i] = avg;
      i = j + 1;
    }
    return r;
  };

  const ra = rank(paired.map((p) => p.a));
  const rb = rank(paired.map((p) => p.b));
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  const d = Math.sqrt(da * db);
  return d === 0 ? 0 : num / d;
}

export { spearmanFor, percentileOf, makeRng };

/** Formats an interval the way a research note would. */
export function fmtInterval(i: Interval, unit = ""): string {
  return `${i.estimate}${unit} (95% CI ${i.low}–${i.high}${unit})`;
}

export { computeDivergence, PROVIDERS };
