import { describe, it, expect } from "vitest";
import {
  SCREENS,
  analyseScreen,
  analyseAllScreens,
  screeningHeadline,
  turnoverForScreen,
  turnoverAcrossScreens,
  screeningForCompany,
} from "./screening";
import { COMPANIES } from "@/data/companies";
import { PROVIDER_IDS } from "./providers";

describe("screen definitions", () => {
  it("defines four institutional mandates", () => {
    expect(SCREENS).toHaveLength(4);
  });

  it("words each screen the way a mandate would", () => {
    for (const s of SCREENS) {
      expect(s.mandateLanguage.length).toBeGreaterThan(30);
      expect(s.usedFor.length).toBeGreaterThan(20);
    }
  });
});

describe("eligibility analysis", () => {
  const impacts = analyseAllScreens();

  it("evaluates every holding under every screen", () => {
    for (const i of impacts) expect(i.companies).toHaveLength(COMPANIES.length);
  });

  it("marks a holding contested only when vendors actually disagree", () => {
    for (const i of impacts) {
      for (const c of i.companies) {
        const included = c.includedBy.length;
        const excluded = c.excludedBy.length;
        expect(c.contested).toBe(included > 0 && excluded > 0);
      }
    }
  });

  it("counts unanimous verdicts consistently with contested ones", () => {
    for (const i of impacts) {
      const total = i.unanimousInclude + i.unanimousExclude + i.contestedCount;
      expect(total).toBe(i.companies.length);
    }
  });

  it("keeps contested share inside 0-100", () => {
    for (const i of impacts) {
      expect(i.contestedShare).toBeGreaterThanOrEqual(0);
      expect(i.contestedShare).toBeLessThanOrEqual(100);
    }
  });

  it("reports a portfolio size for every vendor", () => {
    for (const i of impacts) {
      for (const p of PROVIDER_IDS) {
        expect(i.portfolioSizeByProvider[p]).toBeGreaterThanOrEqual(0);
        expect(i.portfolioSizeByProvider[p]).toBeLessThanOrEqual(30);
      }
    }
  });

  it("computes overlap as a percentage below 100 where portfolios differ", () => {
    for (const i of impacts) {
      expect(i.minOverlap.overlap).toBeGreaterThanOrEqual(0);
      expect(i.minOverlap.overlap).toBeLessThanOrEqual(100);
    }
  });
});

describe("turnover and cost", () => {
  const estimates = turnoverAcrossScreens();

  it("bounds one-way name turnover at 100%", () => {
    // Regression guard. An earlier version divided the symmetric difference by
    // the larger portfolio and reported a nonsensical "113% of names".
    for (const t of estimates) {
      expect(t.nameTurnover).toBeGreaterThanOrEqual(0);
      expect(t.nameTurnover).toBeLessThanOrEqual(100);
    }
  });

  it("bounds value turnover at 100%", () => {
    for (const t of estimates) {
      expect(t.valueTurnover).toBeGreaterThanOrEqual(0);
      expect(t.valueTurnover).toBeLessThanOrEqual(100);
    }
  });

  it("orders the cost range low <= mid <= high", () => {
    for (const t of estimates) {
      expect(t.costBpLow).toBeLessThanOrEqual(t.costBpMid);
      expect(t.costBpMid).toBeLessThanOrEqual(t.costBpHigh);
    }
  });

  it("scales cost with turnover", () => {
    const sorted = [...estimates].sort((a, b) => a.valueTurnover - b.valueTurnover);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].costBpMid).toBeGreaterThanOrEqual(sorted[i - 1].costBpMid);
    }
  });

  it("is deterministic", () => {
    expect(turnoverForScreen("top_quartile")).toEqual(
      turnoverForScreen("top_quartile"),
    );
  });
});

describe("headline", () => {
  const h = screeningHeadline();

  it("finds rank-based screens more robust than absolute floors", () => {
    // The actionable finding: raters disagree about levels far more than about
    // ordering, so mandates written against a rank are less vendor-dependent.
    expect(h.best.contestedShare).toBeLessThan(h.worst.contestedShare);
    expect(h.best.screen.basis).toBe("universe");
  });

  it("never reports more ever-contested holdings than exist", () => {
    expect(h.everContested).toBeLessThanOrEqual(COMPANIES.length);
  });
});

describe("per-company view", () => {
  it("returns a verdict for each screen", () => {
    const rows = screeningForCompany("XOM");
    expect(rows).toHaveLength(SCREENS.length);
    for (const r of rows!) {
      expect(["included", "excluded", "contested"]).toContain(r.verdict);
    }
  });

  it("returns null for an unknown ticker rather than throwing", () => {
    expect(screeningForCompany("NOPE")).toBeNull();
  });

  it("agrees with the universe-level analysis", () => {
    const perCompany = screeningForCompany("TSLA")!;
    const universeLevel = analyseScreen("top_quartile");
    const row = universeLevel.companies.find((c) => c.ticker === "TSLA")!;
    const match = perCompany.find((p) => p.screen.id === "top_quartile")!;
    expect(match.result.passCount).toBe(row.passCount);
  });
});
