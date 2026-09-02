/**
 * Export serialisers.
 *
 * Every export carries the same provenance discipline as the UI: a header
 * block naming the source, the generation date, the divergence formula, and
 * — while the seed data is unverified — an explicit warning that the figures
 * are illustrative. A CSV that escapes into a spreadsheet loses all of the
 * on-screen context, so the context has to travel with it.
 */

import { COMPANIES, SECTORS, getCompany } from "@/data/companies";
import { RATINGS } from "@/data/ratings";
import { PROVIDERS, PROVIDER_IDS } from "./providers";
import { normalisedRatingsFor } from "./normalise";
import { computeDivergence, universe, correlationMatrix, PROFILES, BANDS } from "./divergence";
import { explain, CATEGORY_LABELS } from "./explain";
import { VALIDATION } from "./validate";
import { analyseAllScreens, screeningHeadline } from "./screening";

const DIVERGENCE_FORMULA = "score = max(normalisedRange, percentileRange)";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** RFC 4180 escaping. Also neutralises spreadsheet formula injection. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // A leading =, +, - or @ is executed as a formula by Excel and Sheets.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

function preamble(title: string): unknown[][] {
  const unverified = VALIDATION.total - VALIDATION.verified;
  const rows: unknown[][] = [
    [`ESG Divergence Analyser — ${title}`],
    ["Generated", today()],
    ["Divergence formula", DIVERGENCE_FORMULA],
    ["Bands", "0-15 Aligned | 16-35 Mild | 36-60 Significant | 61+ Extreme"],
  ];
  if (unverified > 0) {
    rows.push([
      "WARNING",
      `${unverified} of ${VALIDATION.total} rating records are ILLUSTRATIVE PLACEHOLDERS, not published provider ratings. Do not cite as real MSCI / Sustainalytics / LSEG / S&P Global data.`,
    ]);
  }
  rows.push([]);
  return rows;
}

/* ------------------------------------------------------------------ *
 * Individual datasets
 * ------------------------------------------------------------------ */

/** Raw ratings, exactly as they entered the system, with provenance. */
export function ratingsCsv(ticker?: string): string {
  const records = ticker
    ? RATINGS.filter((r) => r.ticker === ticker.toUpperCase())
    : RATINGS;

  const rows: unknown[][] = [
    ...preamble(ticker ? `Raw ratings — ${ticker.toUpperCase()}` : "Raw ratings"),
    [
      "Ticker",
      "Company",
      "Provider",
      "Raw score",
      "Scale",
      "Direction",
      "Environmental",
      "Social",
      "Governance",
      "As of",
      "Provenance",
      "Verified",
      "Source URL",
    ],
  ];

  for (const r of records) {
    const p = PROVIDERS[r.provider];
    rows.push([
      r.ticker,
      getCompany(r.ticker)?.name ?? "",
      p.name,
      r.rawScore,
      p.scale.unit,
      p.scale.direction === "lower_better" ? "lower is better" : "higher is better",
      r.pillars?.environmental ?? "",
      r.pillars?.social ?? "",
      r.pillars?.governance ?? "",
      r.asOf,
      r.provenance,
      r.verified ? "yes" : "NO",
      r.sourceUrl ?? "",
    ]);
  }

  return toCsv(rows);
}

/** Normalised scores, percentiles and uncertainty bands. */
export function normalisedCsv(ticker?: string): string {
  const tickers = ticker ? [ticker.toUpperCase()] : COMPANIES.map((c) => c.ticker);

  const rows: unknown[][] = [
    ...preamble(
      ticker ? `Normalised scores — ${ticker.toUpperCase()}` : "Normalised scores",
    ),
    [
      "Ticker",
      "Company",
      "Sector",
      "Provider",
      "Native rating",
      "Normalised (0-100, higher better)",
      "Band low",
      "Band high",
      "Sector percentile",
      "As of",
      "Verified",
    ],
  ];

  for (const t of tickers) {
    const company = getCompany(t);
    if (!company) continue;
    for (const r of normalisedRatingsFor(t)) {
      rows.push([
        t,
        company.name,
        SECTORS[company.sector].name,
        PROVIDERS[r.provider].shortName,
        r.rawLabel,
        r.normalised,
        r.band.low,
        r.band.high,
        r.sectorPercentile,
        r.asOf,
        r.verified ? "yes" : "NO",
      ]);
    }
  }

  return toCsv(rows);
}

/** Divergence metrics for the whole universe. */
export function divergenceCsv(): string {
  const rows: unknown[][] = [
    ...preamble("Divergence metrics"),
    [
      "Ticker",
      "Company",
      "Sector",
      "Consensus",
      "Divergence score",
      "Band",
      "Disagreement type",
      "Level spread",
      "Rank spread",
      "Std dev",
      "Widest pair",
      "Widest gap",
      "E spread",
      "S spread",
      "G spread",
      "Providers",
    ],
  ];

  for (const row of universe()) {
    const d = row.divergence;
    rows.push([
      row.ticker,
      row.name,
      SECTORS[row.sector].name,
      row.consensus,
      d.score,
      BANDS[d.band].label,
      PROFILES[d.profile].label,
      d.normalisedRange,
      d.percentileRange,
      d.stdDev,
      d.widestPair
        ? `${PROVIDERS[d.widestPair.a].shortName} vs ${PROVIDERS[d.widestPair.b].shortName}`
        : "",
      d.widestPair?.normalisedDelta ?? "",
      d.pillarRanges.environmental ?? "",
      d.pillarRanges.social ?? "",
      d.pillarRanges.governance ?? "",
      d.providerCount,
    ]);
  }

  return toCsv(rows);
}

/** The explanation drivers — why each company's providers disagree. */
export function driversCsv(ticker?: string): string {
  const tickers = ticker ? [ticker.toUpperCase()] : COMPANIES.map((c) => c.ticker);

  const rows: unknown[][] = [
    ...preamble(
      ticker ? `Divergence drivers — ${ticker.toUpperCase()}` : "Divergence drivers",
    ),
    [
      "Ticker",
      "Company",
      "Pair analysed",
      "Summary",
      "Driver",
      "Category",
      "Attribute",
      "Explanation",
      "Favours",
      "Weight",
      "Confidence",
    ],
  ];

  for (const t of tickers) {
    const company = getCompany(t);
    if (!company) continue;
    const d = computeDivergence(t);
    const e = explain(t);
    const pair = d.widestPair
      ? `${PROVIDERS[d.widestPair.a].shortName} vs ${PROVIDERS[d.widestPair.b].shortName}`
      : "";

    for (const driver of e.drivers) {
      rows.push([
        t,
        company.name,
        pair,
        e.summary,
        driver.title,
        CATEGORY_LABELS[driver.category].label,
        driver.attribute,
        driver.detail,
        driver.favours ? PROVIDERS[driver.favours].shortName : "",
        driver.weight,
        driver.confidence,
      ]);
    }
  }

  return toCsv(rows);
}

/** Provider methodology profiles — the knowledge base itself. */
export function methodologyCsv(): string {
  const rows: unknown[][] = [
    ...preamble("Provider methodology profiles"),
    [
      "Provider",
      "Owner",
      "Scale",
      "Direction",
      "What it measures",
      "Benchmark basis",
      "Materiality lens",
      "Non-disclosure treatment",
      "Controversy handling",
      "Update cadence",
      "Company-reported %",
      "Media/NGO %",
      "Modelled %",
      "Weighting",
      "Source",
    ],
  ];

  for (const p of PROVIDER_IDS.map((id) => PROVIDERS[id])) {
    rows.push([
      p.name,
      p.owner,
      p.scale.unit,
      p.scale.direction === "lower_better" ? "lower is better" : "higher is better",
      p.framing,
      p.benchmark,
      p.materiality,
      p.disclosure,
      p.controversy,
      p.cadence,
      p.dataMix.selfReported,
      p.dataMix.mediaAndNgo,
      p.dataMix.modelled,
      p.weighting,
      p.sourceUrl,
    ]);
  }

  return toCsv(rows);
}

/** Spearman rank correlation matrix. */
export function correlationCsv(): string {
  const matrix = correlationMatrix();
  const rows: unknown[][] = [
    ...preamble("Provider rank correlation (Spearman)"),
    ["", ...PROVIDER_IDS.map((p) => PROVIDERS[p].shortName)],
  ];

  for (const a of PROVIDER_IDS) {
    rows.push([
      PROVIDERS[a].shortName,
      ...PROVIDER_IDS.map((b) => (a === b ? 1 : matrix[`${a}:${b}`])),
    ]);
  }

  return toCsv(rows);
}

/** Screening impact: which holdings change eligibility by vendor. */
export function screeningCsv(): string {
  const rows: unknown[][] = [
    ...preamble("Screening impact"),
    [
      "Screen",
      "Mandate language",
      "Ticker",
      "Company",
      "Sector",
      ...PROVIDER_IDS.map((p) => `${PROVIDERS[p].shortName} eligible`),
      "Vendors including",
      "Vendors excluding",
      "Contested",
    ],
  ];

  for (const impact of analyseAllScreens()) {
    for (const c of impact.companies) {
      rows.push([
        impact.screen.name,
        impact.screen.mandateLanguage,
        c.ticker,
        c.name,
        SECTORS[c.sector].name,
        ...PROVIDER_IDS.map((p) =>
          c.byProvider[p] === null ? "" : c.byProvider[p] ? "yes" : "no",
        ),
        c.includedBy.map((p) => PROVIDERS[p].shortName).join(" | "),
        c.excludedBy.map((p) => PROVIDERS[p].shortName).join(" | "),
        c.contested ? "YES" : "no",
      ]);
    }
  }

  return toCsv(rows);
}

/* ------------------------------------------------------------------ *
 * Full JSON bundle
 * ------------------------------------------------------------------ */

export function fullJson(ticker?: string): string {
  const tickers = ticker ? [ticker.toUpperCase()] : COMPANIES.map((c) => c.ticker);
  const unverified = VALIDATION.total - VALIDATION.verified;

  return JSON.stringify(
    {
      meta: {
        tool: "ESG Ratings Aggregator & Divergence Analyser",
        generated: today(),
        divergenceFormula: DIVERGENCE_FORMULA,
        bands: BANDS,
        attributionFramework:
          "Berg, Kölbel & Rigobon (2022), Aggregate Confusion: The Divergence of ESG Ratings, Review of Finance 26(6)",
        dataWarning:
          unverified > 0
            ? `${unverified} of ${VALIDATION.total} rating records are ILLUSTRATIVE PLACEHOLDERS, not published provider ratings. Do not cite as real MSCI / Sustainalytics / LSEG / S&P Global data.`
            : null,
        validation: {
          total: VALIDATION.total,
          verified: VALIDATION.verified,
          illustrative: VALIDATION.illustrative,
        },
      },
      providers: PROVIDER_IDS.map((id) => PROVIDERS[id]),
      companies: tickers.map((t) => {
        const company = getCompany(t)!;
        return {
          ...company,
          sectorName: SECTORS[company.sector].name,
          ratings: normalisedRatingsFor(t),
          divergence: computeDivergence(t),
          explanation: explain(t),
        };
      }),
      correlation: correlationMatrix(),
      screening: {
        headline: screeningHeadline(),
        byScreen: analyseAllScreens().map((s) => ({
          screen: s.screen,
          contestedCount: s.contestedCount,
          contestedShare: s.contestedShare,
          portfolioSizeByProvider: s.portfolioSizeByProvider,
          minOverlap: s.minOverlap,
          contested: s.contested.map((c) => c.ticker),
        })),
      },
    },
    null,
    2,
  );
}

/* ------------------------------------------------------------------ *
 * Manifest consumed by the export menu
 * ------------------------------------------------------------------ */

export type ExportFormat = "csv" | "json";

export interface ExportItem {
  id: string;
  label: string;
  description: string;
  format: ExportFormat;
}

export const EXPORT_ITEMS: ExportItem[] = [
  {
    id: "divergence",
    label: "Divergence metrics",
    description: "Score, band, disagreement type and spreads for every company",
    format: "csv",
  },
  {
    id: "normalised",
    label: "Normalised scores",
    description: "Common-scale values, uncertainty bands and sector percentiles",
    format: "csv",
  },
  {
    id: "ratings",
    label: "Raw ratings",
    description: "Provider-native scores with full provenance",
    format: "csv",
  },
  {
    id: "drivers",
    label: "Divergence drivers",
    description: "Every reason the engine emits, per company",
    format: "csv",
  },
  {
    id: "methodology",
    label: "Methodology profiles",
    description: "The provider knowledge base",
    format: "csv",
  },
  {
    id: "correlation",
    label: "Correlation matrix",
    description: "Spearman rank correlation between providers",
    format: "csv",
  },
  {
    id: "screening",
    label: "Screening impact",
    description: "Which holdings change eligibility by vendor, per mandate type",
    format: "csv",
  },
  {
    id: "full",
    label: "Complete dataset",
    description: "Everything above, structured",
    format: "json",
  },
];

export function buildExport(id: string, ticker?: string): string {
  switch (id) {
    case "ratings":
      return ratingsCsv(ticker);
    case "normalised":
      return normalisedCsv(ticker);
    case "divergence":
      return divergenceCsv();
    case "drivers":
      return driversCsv(ticker);
    case "methodology":
      return methodologyCsv();
    case "correlation":
      return correlationCsv();
    case "screening":
      return screeningCsv();
    case "full":
      return fullJson(ticker);
    default:
      throw new Error(`Unknown export: ${id}`);
  }
}
