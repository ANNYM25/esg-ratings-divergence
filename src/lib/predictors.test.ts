import { describe, it, expect } from "vitest";
import { analysePredictors, predictorSummary, MIN_GROUP_N } from "./predictors";
import { COMPANIES } from "@/data/companies";

describe("predictor analysis", () => {
  const results = analysePredictors();

  it("tests four pre-stated hypotheses", () => {
    expect(results).toHaveLength(4);
    for (const r of results) {
      // The hypothesis must be stated, so it can be judged as held or rejected
      // rather than fitted after the fact.
      expect(r.hypothesis.length).toBeGreaterThan(40);
      expect(r.mechanism.length).toBeGreaterThan(40);
    }
  });

  it("assigns every company to exactly one group per predictor", () => {
    for (const r of results) {
      const total = r.groups.reduce((a, g) => a + g.n, 0);
      expect(total).toBe(COMPANIES.length);
    }
  });

  it("flags groups below the minimum size", () => {
    // Regression guard. An earlier version compared a group of one against a
    // group of eighteen and reported it as a finding.
    for (const r of results) {
      for (const g of r.groups) {
        expect(g.underpowered).toBe(g.n < MIN_GROUP_N);
      }
    }
  });

  it("excludes underpowered groups from the effect-size comparison", () => {
    for (const r of results) {
      const usable = r.groups.filter((g) => !g.underpowered);
      if (usable.length < 2 || !r.comparedGroups) continue;
      for (const label of r.comparedGroups) {
        expect(usable.map((g) => g.label)).toContain(label);
      }
    }
  });

  it("labels effect sizes by the conventional Cohen thresholds", () => {
    for (const r of results) {
      const abs = Math.abs(r.effectSize);
      const expected =
        abs < 0.2 ? "negligible" : abs < 0.5 ? "small" : abs < 0.8 ? "medium" : "large";
      expect(r.effectLabel).toBe(expected);
    }
  });

  it("only claims separation when intervals genuinely do not overlap", () => {
    for (const r of results) {
      if (!r.separated || !r.comparedGroups) continue;
      const [a, b] = r.comparedGroups.map(
        (l) => r.groups.find((g) => g.label === l)!,
      );
      const disjoint =
        a.meanDivergence.low > b.meanDivergence.high ||
        b.meanDivergence.low > a.meanDivergence.high;
      expect(disjoint).toBe(true);
    }
  });
});

describe("predictor summary", () => {
  const s = predictorSummary();

  it("counts supported hypotheses correctly", () => {
    expect(s.supported).toBe(s.results.filter((r) => r.supported).length);
    expect(s.total).toBe(s.results.length);
  });

  it("prefers a result with separated intervals as the strongest", () => {
    // A large effect size with overlapping intervals is not something to lead
    // with, regardless of how large the d is.
    const anySeparated = s.results.some((r) => r.separated);
    if (anySeparated) expect(s.strongest.separated).toBe(true);
  });

  it("states a conclusion that reflects the count", () => {
    expect(s.conclusion).toContain(String(s.supported));
  });
});
