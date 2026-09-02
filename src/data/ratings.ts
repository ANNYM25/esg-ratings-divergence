/**
 * Phase 2 — Seed ratings dataset.
 *
 * ⚠️  PROVENANCE WARNING — READ BEFORE USING THIS TOOL FOR ANYTHING REAL ⚠️
 *
 * Every record below is marked `provenance: "illustrative"` and
 * `verified: false`. These are CALIBRATED SYNTHETIC VALUES, not real ratings.
 * They are NOT the published scores of MSCI, Morningstar Sustainalytics, LSEG
 * or S&P Global, and must not be cited as such.
 *
 * WHY THE TOOL SHIPS WITH SYNTHETIC DATA
 * Those three raters' scores are proprietary and licensed. There is no lawful
 * automated route to them: no free API exists, Yahoo Finance's ESG endpoint
 * (the usual free proxy) was Sustainalytics-derived and has been unreliable
 * since ~2023, and the providers' terms prohibit scraping their public lookup
 * pages. Fabricating a data pipeline that cannot exist would be worse than
 * saying so.
 *
 * HOW THESE VALUES WERE CONSTRUCTED — two stages, both reproducible
 *
 *   1. STRUCTURE. Written by hand to reproduce the divergence patterns the
 *      literature documents: industry-relative raters scoring oil majors
 *      respectably, disclosure-weighted raters rewarding heavy reporters,
 *      absolute risk raters penalising high-exposure sectors, and the specific
 *      cases the explanation engine leans on (Tesla, Meta, Exxon, Visa).
 *
 *   2. CALIBRATION. The hand-written stage produced values that were far too
 *      internally agreeable — pairwise Spearman correlations of 0.33 to 0.94,
 *      against the 0.38–0.71 range Berg, Kölbel & Rigobon (2022) report across
 *      six major raters. Real raters carry idiosyncratic variance (analyst
 *      judgement, proprietary indicators, differing update timing) that a
 *      hand-written table lacks. `scripts/calibrate.mts` injects that variance
 *      as a deterministic seeded shock, constrained so that:
 *        - all six pairwise correlations land inside the published range
 *        - each rater's mean view of each SECTOR is unchanged
 *        - no single value moves more than 18 points on the common scale
 *        - the named narrative cases do not flip
 *
 * The result is a dataset whose correlation STRUCTURE matches the empirical
 * literature, even though no individual value is a real rating. That makes it
 * suitable for demonstrating and testing the analytics. It is not suitable for
 * any statement about a real company.
 *
 * Re-run the calibration report at any time:  npm run calibrate
 *
 * TO MAKE THIS TOOL REAL: replace each row with a figure transcribed from the
 * provider's own public disclosure, set `sourceUrl` to the page you took it
 * from, set `asOf` to the provider's stated rating date, and flip `verified`
 * to true. `validateRatings()` in lib/validate.ts will tell you what is still
 * outstanding. The application surfaces the unverified count on every screen
 * and will not let the warning be dismissed while any record is unverified.
 *
 * Scales, as a reminder:
 *   msci   — 0–10 industry-adjusted score, higher is better
 *   sus    — unmanaged ESG risk, LOWER IS BETTER
 *   lseg   — 0–100 percentile-ranked score, higher is better
 *   spcsa  — 0–100 CSA score, higher is better
 *
 * Each tuple is [overall, environmental, social, governance].
 */

import type { Pillar, ProviderId, RatingRecord } from "@/lib/types";

interface SeedRow {
  t: string;
  msci: [number, number, number, number];
  sus: [number, number, number, number];
  lseg: [number, number, number, number];
  spcsa: [number, number, number, number];
}

const SEED: SeedRow[] = [
  /* ---------------------------- Energy ----------------------------
   * Pattern: MSCI and LSEG grade within the industry, so majors look
   * respectable. Sustainalytics grades absolutely, so the whole sector
   * lands in High/Severe risk. This is the sector's structural divergence. */
  { t: "XOM",   msci: [2.9, 3.0, 3.8, 2.6], sus: [38.2, 21.4, 16.2, 12.1], lseg: [66, 70, 60, 58], spcsa: [61, 59, 58, 65] },
  { t: "CVX",   msci: [4.4, 4.2, 4.8, 4.2], sus: [35.1, 18.9, 13.5, 9.8], lseg: [74, 78, 72, 70], spcsa: [29, 25, 35, 24] },
  { t: "SHEL",  msci: [7.5, 7.3, 6.8, 8.1], sus: [31.9, 17.3, 12.6, 10.2], lseg: [94, 96, 93, 87], spcsa: [55, 55, 59, 54] },
  { t: "BP",    msci: [6.1, 5.5, 6.5, 7.2], sus: [30.8, 16.5, 12.5, 10.8], lseg: [87, 95, 84, 81], spcsa: [55, 53, 57, 57] },
  { t: "COP",   msci: [5.9, 5.1, 6.0, 6.0], sus: [34.4, 20.2, 13.5, 11.3], lseg: [60, 65, 55, 59], spcsa: [44, 35, 42, 42] },
  { t: "OXY",   msci: [2.1, 2.1, 2.9, 1.6], sus: [37.1, 22.1, 15.2, 13.5], lseg: [56, 62, 50, 55], spcsa: [52, 47, 56, 53] },

  /* -------------------------- Technology --------------------------
   * Pattern: META is the case study — strong disclosure and low operational
   * footprint lift LSEG, while governance structure and privacy/content
   * controversies collapse MSCI. NVDA shows the disclosure gap: excellent
   * risk profile, thin reporting, so LSEG lags Sustainalytics badly. */
  { t: "AAPL",  msci: [6.0, 6.6, 5.5, 5.5], sus: [16.6, 5.4, 7.3, 4.6], lseg: [78, 86, 74, 76], spcsa: [59, 69, 58, 58] },
  { t: "MSFT",  msci: [9.3, 8.8, 8.1, 8.7], sus: [13.9, 4.6, 5.8, 4.6], lseg: [93, 96, 88, 91], spcsa: [81, 81, 80, 74] },
  { t: "NVDA",  msci: [6.1, 6.9, 5.3, 4.9], sus: [15.1, 6.4, 7.7, 5.8], lseg: [70, 75, 69, 68], spcsa: [64, 70, 67, 56] },
  { t: "GOOGL", msci: [6.7, 9.0, 6.2, 5.3], sus: [23.3, 4.9, 10.0, 6.6], lseg: [80, 92, 75, 73], spcsa: [46, 54, 35, 36] },
  { t: "META",  msci: [3.4, 7.5, 1.2, 2.4], sus: [31.2, 7.1, 14.9, 10.5], lseg: [65, 90, 58, 53], spcsa: [25, 42, 12, 18] },
  { t: "TSM",   msci: [9.6, 9.6, 9.6, 9.2], sus: [17.7, 8.2, 5.6, 4.6], lseg: [72, 67, 75, 71], spcsa: [75, 72, 71, 73] },

  /* --------------------------- Consumer ---------------------------
   * Pattern: TSLA is the canonical divergence case in the literature. A
   * climate-positive product lifts industry-relative raters; thin disclosure
   * sinks the disclosure-weighted rater; governance and labour flags sink the
   * absolute risk rater. All four disagree, for different reasons. */
  { t: "TSLA",  msci: [6.0, 8.5, 4.3, 2.6], sus: [25.5, 6.0, 13.0, 8.7], lseg: [57, 70, 50, 46], spcsa: [32, 56, 23, 22] },
  { t: "NKE",   msci: [6.0, 6.2, 5.7, 5.9], sus: [17.0, 5.2, 8.5, 4.8], lseg: [83, 84, 82, 80], spcsa: [70, 80, 74, 68] },
  { t: "KO",    msci: [5.1, 3.6, 6.0, 5.4], sus: [23.4, 9.7, 9.3, 4.8], lseg: [76, 72, 79, 77], spcsa: [44, 45, 40, 50] },
  { t: "PG",    msci: [5.8, 4.6, 5.8, 5.9], sus: [21.8, 9.6, 7.7, 5.1], lseg: [86, 84, 84, 84], spcsa: [70, 69, 68, 79] },
  { t: "MCD",   msci: [5.4, 4.5, 5.7, 5.6], sus: [26.6, 11.1, 10.5, 5.7], lseg: [56, 55, 53, 58], spcsa: [57, 61, 56, 67] },
  { t: "UL",    msci: [9.6, 9.6, 9.0, 9.3], sus: [19.4, 7.7, 6.3, 4.8], lseg: [88, 86, 87, 90], spcsa: [73, 74, 77, 65] },

  /* -------------------------- Financials --------------------------
   * Pattern: banks have almost no operational footprint but enormous financed
   * emissions. Raters that treat carbon as an operational metric score them
   * well; raters with a downstream/double-materiality lens do not. V shows
   * the disclosure gap — genuinely low risk, thin reporting. */
  { t: "JPM",   msci: [4.8, 5.6, 4.9, 4.6], sus: [23.4, 4.8, 8.3, 8.9], lseg: [72, 77, 73, 72], spcsa: [46, 57, 50, 51] },
  { t: "BAC",   msci: [8.2, 8.2, 7.8, 8.3], sus: [23.2, 4.8, 9.8, 8.8], lseg: [80, 83, 79, 73], spcsa: [68, 77, 73, 61] },
  { t: "GS",    msci: [6.0, 7.3, 6.5, 4.6], sus: [27.3, 4.8, 10.9, 12.3], lseg: [78, 85, 80, 76], spcsa: [38, 42, 40, 28] },
  { t: "HSBC",  msci: [7.3, 8.1, 7.1, 6.9], sus: [24.0, 4.8, 10.0, 9.2], lseg: [80, 86, 79, 79], spcsa: [60, 68, 54, 65] },
  { t: "BLK",   msci: [6.8, 6.7, 6.4, 6.5], sus: [20.0, 4.8, 8.2, 7.6], lseg: [76, 81, 76, 77], spcsa: [70, 66, 68, 74] },
  { t: "V",     msci: [5.3, 6.1, 4.6, 4.9], sus: [17.2, 4.8, 8.3, 8.2], lseg: [64, 69, 62, 62], spcsa: [41, 45, 33, 36] },

  /* ------------------------- Industrials --------------------------
   * Pattern: BA shows what a severe, ongoing safety controversy does — raters
   * that run a capping overlay (MSCI) fall much harder than raters that
   * deduct points from one issue score. */
  { t: "BA",    msci: [3.2, 6.1, 2.2, 1.2], sus: [33.0, 4.8, 14.9, 11.2], lseg: [62, 72, 56, 54], spcsa: [22, 36, 17, 19] },
  { t: "CAT",   msci: [4.0, 2.9, 3.6, 3.7], sus: [26.2, 10.5, 8.1, 5.8], lseg: [76, 76, 80, 76], spcsa: [51, 52, 55, 58] },
  { t: "GE",    msci: [7.7, 7.5, 7.4, 7.4], sus: [26.7, 11.5, 9.5, 8.1], lseg: [73, 72, 75, 73], spcsa: [64, 64, 67, 70] },
  { t: "HON",   msci: [5.5, 5.0, 4.9, 4.4], sus: [21.9, 8.7, 6.8, 5.6], lseg: [81, 80, 79, 78], spcsa: [69, 72, 72, 64] },
  { t: "UNP",   msci: [4.8, 5.3, 3.7, 5.3], sus: [26.1, 10.5, 11.5, 6.3], lseg: [64, 70, 63, 64], spcsa: [29, 36, 25, 25] },
  { t: "RTX",   msci: [6.0, 7.5, 5.6, 4.7], sus: [30.1, 9.1, 12.2, 9.4], lseg: [62, 64, 61, 62], spcsa: [36, 45, 28, 40] },
];

const PILLARS: Pillar[] = ["environmental", "social", "governance"];

const AS_OF = "2026-06-30";
const RETRIEVED_AT = "2026-08-18";

function pillarsOf(tuple: [number, number, number, number]) {
  return {
    environmental: tuple[1],
    social: tuple[2],
    governance: tuple[3],
  } as Record<Pillar, number>;
}

function record(
  ticker: string,
  provider: ProviderId,
  tuple: [number, number, number, number],
): RatingRecord {
  return {
    ticker,
    provider,
    rawScore: tuple[0],
    pillars: pillarsOf(tuple),
    asOf: AS_OF,
    provenance: "illustrative",
    // Deliberately false across the board. Flipping these to true is the
    // single manual step that turns this from a prototype into a real tool.
    verified: false,
    retrievedAt: RETRIEVED_AT,
    notes: "Illustrative placeholder — replace with a cited provider figure.",
  };
}

export const RATINGS: RatingRecord[] = SEED.flatMap((row) => [
  record(row.t, "msci", row.msci),
  record(row.t, "sustainalytics", row.sus),
  record(row.t, "lseg", row.lseg),
  record(row.t, "spcsa", row.spcsa),
]);

export function ratingsFor(ticker: string): RatingRecord[] {
  const t = ticker.toUpperCase();
  return RATINGS.filter((r) => r.ticker === t);
}

export function ratingsByProvider(provider: ProviderId): RatingRecord[] {
  return RATINGS.filter((r) => r.provider === provider);
}

export { PILLARS };
