/**
 * Screening impact — the commercial consequence of rater disagreement.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS
 *
 * A portfolio manager does not care, in the abstract, that MSCI and
 * Sustainalytics disagree about a company. They care whether their ESG screen
 * produces a different portfolio depending on which vendor their firm happens
 * to license. That is a procurement decision, a mandate-compliance question and
 * a tracking-error problem all at once.
 *
 * Divergence expressed as a 0-100 score is an academic finding. Divergence
 * expressed as "eleven of your thirty holdings change eligibility depending on
 * the vendor" is an investment problem. This module converts the former into
 * the latter.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Everything here is deterministic. No model is involved.
 */

import { COMPANIES, SECTORS, getCompany } from "@/data/companies";
import { PROVIDER_IDS, PROVIDERS } from "./providers";
import { normalisedRatingsFor, round } from "./normalise";
import type { ProviderId, SectorId } from "./types";

/* ------------------------------------------------------------------ *
 * Screen definitions
 * ------------------------------------------------------------------ */

export type ScreenId =
  | "top_quartile"
  | "exclude_bottom_decile"
  | "absolute_threshold"
  | "best_in_class";

export interface ScreenDefinition {
  id: ScreenId;
  name: string;
  /** How a mandate would actually word it. */
  mandateLanguage: string;
  /** Why an institution uses this screen. */
  usedFor: string;
  basis: "universe" | "sector";
}

export const SCREENS: ScreenDefinition[] = [
  {
    id: "top_quartile",
    name: "Top-quartile inclusion",
    mandateLanguage: "Hold only issuers ranked in the top 25% of the universe on ESG.",
    usedFor:
      "Positive-tilt and 'ESG leaders' mandates, and most ESG-labelled index products.",
    basis: "universe",
  },
  {
    id: "exclude_bottom_decile",
    name: "Bottom-decile exclusion",
    mandateLanguage: "Exclude issuers ranked in the bottom 10% of the universe on ESG.",
    usedFor:
      "Norm-based and risk-mitigation mandates. The most common institutional screen.",
    basis: "universe",
  },
  {
    id: "absolute_threshold",
    name: "Absolute score floor",
    mandateLanguage: "Hold only issuers scoring 50 or above on a normalised 0-100 ESG scale.",
    usedFor:
      "Mandates written against a fixed number rather than a ranking. Highly exposed to level disagreement.",
    basis: "universe",
  },
  {
    id: "best_in_class",
    name: "Best-in-class by sector",
    mandateLanguage: "Within each sector, hold only the top 50% of issuers on ESG.",
    usedFor:
      "Sector-neutral mandates that want ESG tilt without taking sector bets.",
    basis: "sector",
  },
];

/* ------------------------------------------------------------------ *
 * Eligibility
 * ------------------------------------------------------------------ */

/** Whether one company passes one screen, judged by one vendor. */
function passes(
  screen: ScreenId,
  ticker: string,
  provider: ProviderId,
): boolean | null {
  const rating = normalisedRatingsFor(ticker).find((r) => r.provider === provider);
  if (!rating) return null;

  switch (screen) {
    case "top_quartile":
      return rating.universePercentile >= 75;
    case "exclude_bottom_decile":
      return rating.universePercentile > 10;
    case "absolute_threshold":
      return rating.normalised >= 50;
    case "best_in_class":
      return rating.sectorPercentile >= 50;
  }
}

export interface CompanyScreenResult {
  ticker: string;
  name: string;
  sector: SectorId;
  /** Pass/fail under each vendor. */
  byProvider: Record<ProviderId, boolean | null>;
  passCount: number;
  providerCount: number;
  /** True when vendors disagree about eligibility — the whole point. */
  contested: boolean;
  /** Vendors that would include it. */
  includedBy: ProviderId[];
  /** Vendors that would exclude it. */
  excludedBy: ProviderId[];
}

export interface ScreenImpact {
  screen: ScreenDefinition;
  companies: CompanyScreenResult[];
  /** Holdings whose eligibility depends on the vendor. */
  contested: CompanyScreenResult[];
  contestedCount: number;
  /** Share of the universe whose eligibility is vendor-dependent. */
  contestedShare: number;
  /** Portfolio size under each vendor, showing they are not even the same size. */
  portfolioSizeByProvider: Record<ProviderId, number>;
  /** Companies every vendor includes — the only genuinely uncontested holdings. */
  unanimousInclude: number;
  unanimousExclude: number;
  /**
   * Worst-case overlap between any two vendors' portfolios, as a share of the
   * larger one. The practical read: switch vendor and this much of the
   * portfolio turns over for reasons that have nothing to do with the company.
   */
  minOverlap: { a: ProviderId; b: ProviderId; overlap: number };
}

export function analyseScreen(screenId: ScreenId): ScreenImpact {
  const screen = SCREENS.find((s) => s.id === screenId)!;

  const companies: CompanyScreenResult[] = COMPANIES.map((c) => {
    const byProvider = Object.fromEntries(
      PROVIDER_IDS.map((p) => [p, passes(screenId, c.ticker, p)]),
    ) as Record<ProviderId, boolean | null>;

    const decided = PROVIDER_IDS.filter((p) => byProvider[p] !== null);
    const includedBy = decided.filter((p) => byProvider[p] === true);
    const excludedBy = decided.filter((p) => byProvider[p] === false);

    return {
      ticker: c.ticker,
      name: c.name,
      sector: c.sector,
      byProvider,
      passCount: includedBy.length,
      providerCount: decided.length,
      contested: includedBy.length > 0 && excludedBy.length > 0,
      includedBy,
      excludedBy,
    };
  });

  const contested = companies
    .filter((c) => c.contested)
    // Most contested first: a 2-2 split is more interesting than 3-1.
    .sort(
      (a, b) =>
        Math.abs(a.passCount * 2 - a.providerCount) -
        Math.abs(b.passCount * 2 - b.providerCount),
    );

  const portfolioSizeByProvider = Object.fromEntries(
    PROVIDER_IDS.map((p) => [
      p,
      companies.filter((c) => c.byProvider[p] === true).length,
    ]),
  ) as Record<ProviderId, number>;

  // Pairwise portfolio overlap (Jaccard-style, against the larger portfolio).
  let minOverlap = { a: PROVIDER_IDS[0], b: PROVIDER_IDS[1], overlap: 1 };
  for (let i = 0; i < PROVIDER_IDS.length; i++) {
    for (let j = i + 1; j < PROVIDER_IDS.length; j++) {
      const a = PROVIDER_IDS[i];
      const b = PROVIDER_IDS[j];
      const setA = companies.filter((c) => c.byProvider[a] === true).map((c) => c.ticker);
      const setB = companies.filter((c) => c.byProvider[b] === true).map((c) => c.ticker);
      const shared = setA.filter((t) => setB.includes(t)).length;
      const denom = Math.max(setA.length, setB.length);
      const overlap = denom === 0 ? 1 : shared / denom;
      if (overlap < minOverlap.overlap) minOverlap = { a, b, overlap };
    }
  }

  return {
    screen,
    companies,
    contested,
    contestedCount: contested.length,
    contestedShare: round((contested.length / companies.length) * 100, 0),
    portfolioSizeByProvider,
    unanimousInclude: companies.filter(
      (c) => c.providerCount > 0 && c.passCount === c.providerCount,
    ).length,
    unanimousExclude: companies.filter(
      (c) => c.providerCount > 0 && c.passCount === 0,
    ).length,
    minOverlap: { ...minOverlap, overlap: round(minOverlap.overlap * 100, 0) },
  };
}

export function analyseAllScreens(): ScreenImpact[] {
  return SCREENS.map((s) => analyseScreen(s.id));
}

/* ------------------------------------------------------------------ *
 * Headline figures
 * ------------------------------------------------------------------ */

export interface ScreeningHeadline {
  /** Worst screen by contested share — the number to lead with. */
  worst: ScreenImpact;
  /** Best screen — evidence that screen design mitigates the problem. */
  best: ScreenImpact;
  /** Average contested share across all four screens. */
  meanContestedShare: number;
  /** Companies contested under at least one screen. */
  everContested: number;
  /** Companies contested under every screen — the genuinely ambiguous names. */
  alwaysContested: string[];
  /** Lowest portfolio overlap seen anywhere. */
  worstOverlap: { screen: string; a: ProviderId; b: ProviderId; overlap: number };
}

export function screeningHeadline(): ScreeningHeadline {
  const all = analyseAllScreens();
  const sorted = [...all].sort((a, b) => b.contestedShare - a.contestedShare);

  const contestedSets = all.map(
    (s) => new Set(s.contested.map((c) => c.ticker)),
  );
  const everContested = new Set(contestedSets.flatMap((s) => [...s])).size;
  const alwaysContested = COMPANIES.filter((c) =>
    contestedSets.every((s) => s.has(c.ticker)),
  ).map((c) => c.ticker);

  let worstOverlap = {
    screen: all[0].screen.name,
    a: all[0].minOverlap.a,
    b: all[0].minOverlap.b,
    overlap: all[0].minOverlap.overlap,
  };
  for (const s of all) {
    if (s.minOverlap.overlap < worstOverlap.overlap) {
      worstOverlap = {
        screen: s.screen.name,
        a: s.minOverlap.a,
        b: s.minOverlap.b,
        overlap: s.minOverlap.overlap,
      };
    }
  }

  return {
    worst: sorted[0],
    best: sorted[sorted.length - 1],
    meanContestedShare: round(
      all.reduce((a, s) => a + s.contestedShare, 0) / all.length,
      0,
    ),
    everContested,
    alwaysContested,
    worstOverlap,
  };
}

/** Per-company view, for the company detail page. */
export function screeningForCompany(ticker: string) {
  const company = getCompany(ticker);
  if (!company) return null;

  return analyseAllScreens().map((impact) => {
    const row = impact.companies.find((c) => c.ticker === company.ticker)!;
    return {
      screen: impact.screen,
      result: row,
      verdict: row.contested
        ? ("contested" as const)
        : row.passCount === row.providerCount
          ? ("included" as const)
          : ("excluded" as const),
    };
  });
}

export const SECTOR_LABEL = (s: SectorId) => SECTORS[s].short;
export const PROVIDER_LABEL = (p: ProviderId) => PROVIDERS[p].shortName;

/* ------------------------------------------------------------------ *
 * Transaction cost
 * ------------------------------------------------------------------ */

/**
 * Turnover in basis points.
 *
 * "62% of holdings change" is analyst language. A portfolio manager thinks in
 * cost, and until the finding is expressed as cost it does not compete for
 * attention against anything else on their desk.
 *
 * Two refinements over the headline name-count figure:
 *
 *   1. MARKET-CAP WEIGHTING. Name-count turnover implicitly assumes every
 *      position is the same size. Contested names are not evenly distributed
 *      across the size spectrum, so weighting by market cap gives a materially
 *      different — and more honest — answer.
 *
 *   2. A COST ESTIMATE. One-way transaction cost for large-cap developed-market
 *      equity is commonly modelled at 10-25bp all-in (spread, commission and
 *      market impact). The midpoint is used, and the range is reported rather
 *      than hidden, because the assumption drives the answer.
 *
 * This is an order-of-magnitude estimate presented as such. It is not a
 * transaction-cost model, and the assumptions are stated on the page.
 */
export const COST_ASSUMPTIONS = {
  oneWayBpLow: 10,
  oneWayBpMid: 17.5,
  oneWayBpHigh: 25,
  note: "One-way all-in cost for large-cap developed-market equity: bid-ask spread, commission and market impact.",
};

export interface TurnoverEstimate {
  screen: ScreenDefinition;
  a: ProviderId;
  b: ProviderId;
  /** Share of NAMES that differ between the two vendors' portfolios. */
  nameTurnover: number;
  /** Share of VALUE that differs, weighting by market cap. */
  valueTurnover: number;
  /** One-off cost of switching vendor, in basis points of portfolio value. */
  costBpLow: number;
  costBpMid: number;
  costBpHigh: number;
}

function capOf(ticker: string): number {
  return COMPANIES.find((c) => c.ticker === ticker)?.marketCapUsdB ?? 0;
}

/** Worst-case vendor switch for a given screen. */
export function turnoverForScreen(screenId: ScreenId): TurnoverEstimate {
  const impact = analyseScreen(screenId);
  const screen = impact.screen;

  let worst: TurnoverEstimate | null = null;

  for (let i = 0; i < PROVIDER_IDS.length; i++) {
    for (let j = i + 1; j < PROVIDER_IDS.length; j++) {
      const a = PROVIDER_IDS[i];
      const b = PROVIDER_IDS[j];

      const inA = impact.companies.filter((c) => c.byProvider[a] === true);
      const inB = impact.companies.filter((c) => c.byProvider[b] === true);
      if (inA.length === 0 || inB.length === 0) continue;

      const tickersA = new Set(inA.map((c) => c.ticker));
      const tickersB = new Set(inB.map((c) => c.ticker));

      // One-way turnover: the share of the CURRENT portfolio that must be sold
      // when switching from vendor A to vendor B.
      //
      // An earlier version divided the symmetric difference by the larger
      // portfolio, which can exceed 100% and reported a nonsensical "113% of
      // names". Turnover is naturally directional, and the question a manager
      // asks is "what fraction of what I hold today would I have to sell",
      // which is bounded at 100% by construction.
      const sold = [...tickersA].filter((t) => !tickersB.has(t));
      const nameTurnover = tickersA.size === 0 ? 0 : sold.length / tickersA.size;

      // Value-weighted: each portfolio is equal-risk-budgeted by market cap
      // within itself, so turnover is the share of A's weight that must be
      // sold plus the share of B's weight that must be bought, halved to give
      // a one-way figure.
      const totalA = inA.reduce((s, c) => s + capOf(c.ticker), 0);
      const totalB = inB.reduce((s, c) => s + capOf(c.ticker), 0);
      const soldWeight =
        totalA === 0
          ? 0
          : inA
              .filter((c) => !tickersB.has(c.ticker))
              .reduce((s, c) => s + capOf(c.ticker), 0) / totalA;
      const boughtWeight =
        totalB === 0
          ? 0
          : inB
              .filter((c) => !tickersA.has(c.ticker))
              .reduce((s, c) => s + capOf(c.ticker), 0) / totalB;
      const valueTurnover = (soldWeight + boughtWeight) / 2;

      const candidate: TurnoverEstimate = {
        screen,
        a,
        b,
        nameTurnover: round(nameTurnover * 100, 0),
        valueTurnover: round(valueTurnover * 100, 0),
        // Both a sell and a buy leg, hence 2x the one-way rate.
        costBpLow: round(valueTurnover * 2 * COST_ASSUMPTIONS.oneWayBpLow, 1),
        costBpMid: round(valueTurnover * 2 * COST_ASSUMPTIONS.oneWayBpMid, 1),
        costBpHigh: round(valueTurnover * 2 * COST_ASSUMPTIONS.oneWayBpHigh, 1),
      };

      if (!worst || candidate.valueTurnover > worst.valueTurnover)
        worst = candidate;
    }
  }

  return (
    worst ?? {
      screen,
      a: PROVIDER_IDS[0],
      b: PROVIDER_IDS[1],
      nameTurnover: 0,
      valueTurnover: 0,
      costBpLow: 0,
      costBpMid: 0,
      costBpHigh: 0,
    }
  );
}

export function turnoverAcrossScreens(): TurnoverEstimate[] {
  return SCREENS.map((s) => turnoverForScreen(s.id)).sort(
    (a, b) => b.valueTurnover - a.valueTurnover,
  );
}
