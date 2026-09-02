import { describe, it, expect } from "vitest";
import {
  computeDivergence,
  bandFor,
  spearman,
  universe,
  universeStats,
  BANDS,
  PROFILES,
} from "./divergence";
import { COMPANIES } from "@/data/companies";
import { PROVIDER_IDS } from "./providers";

describe("divergence score", () => {
  it("is the LARGER of the level and rank spreads, not the average", () => {
    // Regression guard. An averaged score produced a documented false negative:
    // Meta was ranked last in tech by all four raters (rank spread 0) while
    // sitting 30 points apart on level, and the average called that "Aligned".
    for (const c of COMPANIES.slice(0, 10)) {
      const d = computeDivergence(c.ticker);
      expect(d.score).toBeCloseTo(
        Math.max(d.normalisedRange, d.percentileRange),
        1,
      );
    }
  });

  it("never lets agreement on one dimension mask disagreement on the other", () => {
    for (const c of COMPANIES) {
      const d = computeDivergence(c.ticker);
      expect(d.score).toBeGreaterThanOrEqual(d.normalisedRange);
      expect(d.score).toBeGreaterThanOrEqual(d.percentileRange);
    }
  });

  it("stays within 0-100", () => {
    for (const c of COMPANIES) {
      const d = computeDivergence(c.ticker);
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    }
  });

  it("assigns a band consistent with the published thresholds", () => {
    for (const c of COMPANIES) {
      const d = computeDivergence(c.ticker);
      const band = BANDS[d.band];
      expect(d.score).toBeGreaterThanOrEqual(band.min);
      expect(d.score).toBeLessThanOrEqual(band.max);
    }
  });

  it("classifies disagreement type consistently with the components", () => {
    for (const c of COMPANIES) {
      const d = computeDivergence(c.ticker);
      const level = d.normalisedRange >= 20;
      const rank = d.percentileRange >= 20;
      const expected =
        level && rank ? "both" : level ? "level" : rank ? "rank" : "none";
      expect(d.profile).toBe(expected);
      expect(PROFILES[d.profile]).toBeDefined();
    }
  });
});

describe("band boundaries", () => {
  it.each([
    [0, "aligned"],
    [15, "aligned"],
    [16, "mild"],
    [35, "mild"],
    [36, "significant"],
    [60, "significant"],
    [61, "extreme"],
    [100, "extreme"],
  ])("scores %i as %s", (score, band) => {
    expect(bandFor(score)).toBe(band);
  });
});

describe("pairwise gaps", () => {
  it("orders pairs by widest gap first", () => {
    const d = computeDivergence("XOM");
    for (let i = 1; i < d.pairs.length; i++) {
      expect(d.pairs[i - 1].normalisedDelta).toBeGreaterThanOrEqual(
        d.pairs[i].normalisedDelta,
      );
    }
  });

  it("identifies the widest pair as the first entry", () => {
    const d = computeDivergence("XOM");
    expect(d.widestPair).toEqual(d.pairs[0]);
  });

  it("produces one entry per unique provider pair", () => {
    const n = PROVIDER_IDS.length;
    expect(computeDivergence("XOM").pairs).toHaveLength((n * (n - 1)) / 2);
  });
});

describe("Spearman correlation", () => {
  it("is 1 for a provider against itself", () => {
    for (const p of PROVIDER_IDS) expect(spearman(p, p)).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(spearman("msci", "lseg")).toBeCloseTo(spearman("lseg", "msci"), 5);
  });

  it("lands every pair inside the range Berg et al. report (0.38-0.71)", () => {
    // This is the calibration invariant. If it fails, the synthetic data has
    // drifted away from the empirical structure it is meant to reproduce.
    for (let i = 0; i < PROVIDER_IDS.length; i++) {
      for (let j = i + 1; j < PROVIDER_IDS.length; j++) {
        const rho = spearman(PROVIDER_IDS[i], PROVIDER_IDS[j]);
        expect(rho).toBeGreaterThanOrEqual(0.38);
        expect(rho).toBeLessThanOrEqual(0.71);
      }
    }
  });
});

describe("universe aggregation", () => {
  it("covers every company exactly once", () => {
    const rows = universe();
    expect(rows).toHaveLength(COMPANIES.length);
    expect(new Set(rows.map((r) => r.ticker)).size).toBe(COMPANIES.length);
  });

  it("sorts most divergent first", () => {
    const rows = universe();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].divergence.score).toBeGreaterThanOrEqual(
        rows[i].divergence.score,
      );
    }
  });

  it("reports band counts that sum to the universe", () => {
    const s = universeStats();
    const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(s.companies);
  });
});
