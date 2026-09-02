import { describe, it, expect } from "vitest";
import {
  toCommonScale,
  uncertaintyBand,
  nativeLabel,
  sectorPercentile,
  universePercentile,
  normalisedRatingsFor,
  consensusScore,
} from "./normalise";
import { PROVIDERS } from "./providers";
import { COMPANIES } from "@/data/companies";

describe("scale normalisation", () => {
  it("inverts Sustainalytics, because lower risk is a better outcome", () => {
    // The single most misread fact in ESG data. A low risk score must map to
    // a HIGH common-scale value.
    const low = toCommonScale("sustainalytics", 5);
    const high = toCommonScale("sustainalytics", 45);
    expect(low).toBeGreaterThan(high);
  });

  it("normalises Sustainalytics against the practical max of 50, not 100", () => {
    // Against a theoretical max of 100, a risk of 50 would map to 50. Against
    // the practical max it maps to 0, which is what preserves the signal.
    expect(toCommonScale("sustainalytics", 50)).toBe(0);
    expect(toCommonScale("sustainalytics", 0)).toBe(100);
  });

  it("keeps higher-is-better scales in the same direction", () => {
    for (const p of ["msci", "lseg", "spcsa"] as const) {
      const { min, max } = PROVIDERS[p].scale;
      expect(toCommonScale(p, min)).toBeLessThan(toCommonScale(p, max));
    }
  });

  it("maps every provider's full range onto 0-100 without escaping it", () => {
    for (const p of ["msci", "sustainalytics", "lseg", "spcsa"] as const) {
      const { min, max } = PROVIDERS[p].scale;
      for (const v of [min, (min + max) / 2, max]) {
        const c = toCommonScale(p, v);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("uncertainty bands", () => {
  it("treats an MSCI letter as an interval, not a point", () => {
    // AA spans 7.143-8.570 on the underlying score. A point estimate here
    // would manufacture precision that does not exist.
    const band = uncertaintyBand("msci", 7.5);
    expect(band.high - band.low).toBeGreaterThan(10);
    expect(band.low).toBeLessThanOrEqual(toCommonScale("msci", 7.5));
    expect(band.high).toBeGreaterThanOrEqual(toCommonScale("msci", 7.5));
  });

  it("never returns a zero-width band, even on continuous scales", () => {
    // A published integer score is itself rounded; implying exactness would be
    // its own kind of false precision.
    const band = uncertaintyBand("spcsa", 55);
    expect(band.high).toBeGreaterThan(band.low);
  });

  it("keeps bands inside 0-100", () => {
    for (const raw of [0, 5, 10]) {
      const b = uncertaintyBand("msci", raw);
      expect(b.low).toBeGreaterThanOrEqual(0);
      expect(b.high).toBeLessThanOrEqual(100);
    }
  });
});

describe("native labels", () => {
  it("shows MSCI as a letter grade", () => {
    expect(nativeLabel("msci", 7.5)).toBe("AA");
    expect(nativeLabel("msci", 9)).toBe("AAA");
  });

  it("shows Sustainalytics with its risk band", () => {
    expect(nativeLabel("sustainalytics", 24)).toContain("Medium");
  });
});

describe("percentiles", () => {
  it("gives the universe percentile finer granularity than the sector one", () => {
    // Six-company sectors have a 16.7-point step, which turns a one-position
    // difference into an "Extreme" divergence score. This is why the rank
    // component uses the universe.
    const sectorValues = new Set(
      COMPANIES.map((c) => sectorPercentile(c.ticker, "msci")),
    );
    const universeValues = new Set(
      COMPANIES.map((c) => universePercentile(c.ticker, "msci")),
    );
    expect(universeValues.size).toBeGreaterThan(sectorValues.size);
  });

  it("bounds all percentiles to 0-100", () => {
    for (const c of COMPANIES) {
      const p = universePercentile(c.ticker, "lseg");
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("per-company aggregation", () => {
  it("returns one normalised rating per provider", () => {
    expect(normalisedRatingsFor("XOM")).toHaveLength(4);
  });

  it("never zero-fills a missing provider", () => {
    // A company nobody rates is a fact to display, not a gap to paper over.
    const ratings = normalisedRatingsFor("NOT_A_TICKER");
    expect(ratings).toHaveLength(0);
  });

  it("computes consensus as the mean of available ratings", () => {
    const ratings = normalisedRatingsFor("TSLA");
    const expected =
      ratings.reduce((a, r) => a + r.normalised, 0) / ratings.length;
    expect(consensusScore("TSLA")).toBeCloseTo(expected, 1);
  });
});
