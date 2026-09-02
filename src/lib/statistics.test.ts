import { describe, it, expect } from "vitest";
import {
  bootstrap,
  mean,
  stdev,
  percentileOf,
  makeRng,
  permutationNullDivergence,
  thresholdSensitivity,
  inferenceSummary,
} from "./statistics";

describe("deterministic PRNG", () => {
  it("produces identical sequences from identical seeds", () => {
    // Statistics you cannot reproduce are worse than no statistics.
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it("produces different sequences from different seeds", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it("stays within [0, 1)", () => {
    const r = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("summary statistics", () => {
  it("computes the mean", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns zero for an empty mean rather than NaN", () => {
    expect(mean([])).toBe(0);
  });

  it("uses the sample standard deviation (n-1)", () => {
    // Population sd of [2,4,4,4,5,5,7,9] is 2; the sample sd is larger.
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });

  it("interpolates percentiles", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(percentileOf(xs, 0)).toBe(1);
    expect(percentileOf(xs, 1)).toBe(5);
    expect(percentileOf(xs, 0.5)).toBe(3);
  });
});

describe("bootstrap intervals", () => {
  const sample = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

  it("brackets the point estimate", () => {
    const ci = bootstrap(sample);
    expect(ci.low).toBeLessThanOrEqual(ci.estimate);
    expect(ci.high).toBeGreaterThanOrEqual(ci.estimate);
  });

  it("is reproducible for a fixed seed", () => {
    expect(bootstrap(sample, mean, 500, 99)).toEqual(
      bootstrap(sample, mean, 500, 99),
    );
  });

  it("narrows as the sample grows", () => {
    const small = bootstrap([1, 5, 9], mean, 1000, 5);
    const large = bootstrap(
      Array.from({ length: 300 }, (_, i) => (i % 9) + 1),
      mean,
      1000,
      5,
    );
    expect(large.margin).toBeLessThan(small.margin);
  });

  it("collapses to a point for a constant sample", () => {
    const ci = bootstrap([7, 7, 7, 7]);
    expect(ci.low).toBe(7);
    expect(ci.high).toBe(7);
    expect(ci.margin).toBe(0);
  });
});

describe("permutation null", () => {
  const result = permutationNullDivergence(120, 11);

  it("compares like with like", () => {
    // Regression guard. An earlier version tested the observed max(level, rank)
    // against a level-only null, which is not a like-for-like comparison and
    // produced a meaningless p-value of 1.
    expect(result.nullMean).toBeGreaterThan(result.observed);
  });

  it("finds the raters agree more than independent scorers would", () => {
    expect(result.observed).toBeLessThan(result.nullLow);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("brackets the null mean with its own interval", () => {
    expect(result.nullMean).toBeGreaterThanOrEqual(result.nullLow);
    expect(result.nullMean).toBeLessThanOrEqual(result.nullHigh);
  });
});

describe("threshold sensitivity", () => {
  const points = thresholdSensitivity();

  it("sweeps the requested range", () => {
    expect(points[0].threshold).toBe(10);
    expect(points.at(-1)!.threshold).toBe(50);
  });

  it("keeps every contested share inside 0-100", () => {
    for (const p of points) {
      expect(p.contestedShare).toBeGreaterThanOrEqual(0);
      expect(p.contestedShare).toBeLessThanOrEqual(100);
    }
  });

  it("shows material disagreement at every threshold, not just the quartile", () => {
    // If the finding only held at exactly the top quartile, it would be a
    // result about the quartile rather than about the raters.
    expect(Math.min(...points.map((p) => p.contestedShare))).toBeGreaterThan(10);
  });
});

describe("inference summary", () => {
  const s = inferenceSummary();

  it("reports the sample size it was computed from", () => {
    expect(s.sampleSize).toBe(30);
  });

  it("puts mean pairwise correlation inside the published range", () => {
    expect(s.correlationInterval.estimate).toBeGreaterThanOrEqual(0.38);
    expect(s.correlationInterval.estimate).toBeLessThanOrEqual(0.71);
  });
});
