/**
 * Phase 1 — Provider methodology knowledge base.
 *
 * These profiles are the intellectual core of the tool. The divergence
 * explanation engine does not "know" anything about ESG; it mechanically
 * diffs the structured attributes below. Improve the profiles and every
 * explanation in the application improves with them.
 *
 * Every attribute is drawn from the providers' own published methodology
 * documents, linked in `sourceUrl`.
 */

import type { ProviderId, ProviderProfile } from "./types";

export const PROVIDER_IDS: ProviderId[] = [
  "msci",
  "sustainalytics",
  "lseg",
  "spcsa",
];

export const PROVIDERS: Record<ProviderId, ProviderProfile> = {
  msci: {
    id: "msci",
    name: "MSCI ESG Ratings",
    shortName: "MSCI",
    owner: "MSCI Inc.",
    accent: "var(--provider-msci)",
    scale: {
      kind: "letter_bucket",
      min: 0,
      max: 10,
      direction: "higher_better",
      unit: "industry-adjusted score (0–10)",
      // MSCI's published mapping from the 0–10 industry-adjusted score to
      // the seven-rung letter ladder. Each letter is an interval, not a point.
      buckets: [
        { label: "CCC", min: 0.0, max: 1.428 },
        { label: "B", min: 1.429, max: 2.856 },
        { label: "BB", min: 2.857, max: 4.285 },
        { label: "BBB", min: 4.286, max: 5.713 },
        { label: "A", min: 5.714, max: 7.142 },
        { label: "AA", min: 7.143, max: 8.57 },
        { label: "AAA", min: 8.571, max: 10.0 },
      ],
    },
    framing: "performance_management",
    benchmark: "industry_relative",
    materiality: "financial_single",
    disclosure: "imputed",
    controversy: "overlay_cap",
    cadence: "continuous",
    dataMix: { selfReported: 45, mediaAndNgo: 20, modelled: 35 },
    weighting:
      "Key Issue weights assigned per GICS sub-industry; typically 2–7 issues carry the whole rating.",
    selfDescription:
      "Measures a company's resilience to long-term, financially material ESG risks relative to its industry peers.",
    sourceUrl:
      "https://www.msci.com/sustainable-investing/esg-ratings",
  },

  sustainalytics: {
    id: "sustainalytics",
    name: "Sustainalytics ESG Risk Ratings",
    shortName: "Sustainalytics",
    owner: "Morningstar Sustainalytics",
    accent: "var(--provider-sustainalytics)",
    scale: {
      kind: "risk_score",
      min: 0,
      max: 100,
      // The single most misread fact in ESG data: this is a risk score.
      // A LOWER number is a BETTER outcome.
      direction: "lower_better",
      unit: "unmanaged ESG risk (0–100, lower is better)",
      buckets: [
        { label: "Negligible", min: 0, max: 9.99 },
        { label: "Low", min: 10, max: 19.99 },
        { label: "Medium", min: 20, max: 29.99 },
        { label: "High", min: 30, max: 39.99 },
        { label: "Severe", min: 40, max: 100 },
      ],
      // Theoretically 0–100, but essentially no rated company exceeds 50.
      // Normalising against 100 would compress every real company into the
      // top half of the scale and destroy the signal.
      practicalMax: 50,
    },
    framing: "risk_exposure",
    benchmark: "absolute",
    materiality: "financial_single",
    disclosure: "penalised",
    controversy: "direct_deduction",
    cadence: "continuous",
    dataMix: { selfReported: 60, mediaAndNgo: 30, modelled: 10 },
    weighting:
      "Exposure to material ESG issues minus management capacity; the residual is unmanaged risk.",
    selfDescription:
      "Measures the magnitude of a company's unmanaged ESG risk on an absolute scale comparable across all industries.",
    sourceUrl:
      "https://www.sustainalytics.com/esg-data",
  },

  lseg: {
    id: "lseg",
    name: "LSEG ESG Scores",
    shortName: "LSEG",
    owner: "London Stock Exchange Group (formerly Refinitiv)",
    accent: "var(--provider-lseg)",
    scale: {
      kind: "performance_score",
      min: 0,
      max: 100,
      direction: "higher_better",
      unit: "percentile-ranked ESG score (0–100)",
      buckets: [
        { label: "D-", min: 0, max: 8.33 },
        { label: "D", min: 8.34, max: 16.66 },
        { label: "D+", min: 16.67, max: 25.0 },
        { label: "C-", min: 25.01, max: 33.33 },
        { label: "C", min: 33.34, max: 41.66 },
        { label: "C+", min: 41.67, max: 50.0 },
        { label: "B-", min: 50.01, max: 58.33 },
        { label: "B", min: 58.34, max: 66.66 },
        { label: "B+", min: 66.67, max: 75.0 },
        { label: "A-", min: 75.01, max: 83.33 },
        { label: "A", min: 83.34, max: 91.66 },
        { label: "A+", min: 91.67, max: 100 },
      ],
    },
    framing: "performance_management",
    benchmark: "industry_relative",
    materiality: "double",
    // The defining characteristic of LSEG: the score is built almost entirely
    // from what the company chose to publish. Reporting volume is rewarded.
    disclosure: "penalised",
    controversy: "overlay_cap",
    cadence: "annual",
    dataMix: { selfReported: 90, mediaAndNgo: 10, modelled: 0 },
    weighting:
      "Over 630 reported metrics, of which ~186 comparable ones are percentile-ranked within the industry group.",
    selfDescription:
      "Measures relative ESG performance based on verifiable, company-reported data across ten themes.",
    sourceUrl:
      "https://www.lseg.com/en/data-analytics/sustainable-finance/esg-scores",
  },

  spcsa: {
    id: "spcsa",
    name: "S&P Global CSA Score",
    shortName: "S&P CSA",
    owner: "S&P Global",
    accent: "var(--provider-spcsa)",
    scale: {
      kind: "performance_score",
      min: 0,
      max: 100,
      direction: "higher_better",
      unit: "Corporate Sustainability Assessment score (0–100)",
    },
    framing: "performance_management",
    benchmark: "industry_relative",
    materiality: "financial_single",
    disclosure: "penalised",
    controversy: "direct_deduction",
    cadence: "annual",
    dataMix: { selfReported: 80, mediaAndNgo: 15, modelled: 5 },
    weighting:
      "Industry-specific questionnaire; roughly 60% of criteria are tailored to the sector.",
    selfDescription:
      "Assesses financially material sustainability practices through a structured annual questionnaire.",
    sourceUrl:
      "https://www.spglobal.com/esg/csa/",
  },
};

export const PROVIDER_LIST: ProviderProfile[] = PROVIDER_IDS.map(
  (id) => PROVIDERS[id],
);

/** Find the native label for a raw score on a bucketed scale. */
export function bucketFor(
  provider: ProviderId,
  raw: number,
): { label: string; min: number; max: number } | null {
  const buckets = PROVIDERS[provider].scale.buckets;
  if (!buckets) return null;
  return buckets.find((b) => raw >= b.min && raw <= b.max) ?? null;
}

/* ------------------------------------------------------------------ *
 * Human-readable labels for the methodology attributes
 * ------------------------------------------------------------------ */

export const ATTRIBUTE_LABELS: Record<string, string> = {
  framing: "What it measures",
  benchmark: "Benchmark basis",
  materiality: "Materiality lens",
  disclosure: "Non-disclosure treatment",
  controversy: "Controversy handling",
  cadence: "Update cadence",
  weighting: "Weighting scheme",
};

export const VALUE_LABELS: Record<string, string> = {
  risk_exposure: "Unmanaged risk exposure",
  performance_management: "ESG management quality",
  industry_relative: "Relative to industry peers",
  absolute: "Absolute, cross-industry",
  financial_single: "Single materiality (financial)",
  double: "Double materiality",
  penalised: "Penalised as failure",
  imputed: "Estimated from peers",
  neutral: "Excluded, weights redistributed",
  overlay_cap: "Separate overlay, can cap score",
  direct_deduction: "Deducted from issue score",
  integrated: "Folded into management score",
  continuous: "Continuous",
  annual: "Annual cycle",
  higher_better: "Higher is better",
  lower_better: "Lower is better",
};

export function label(value: string): string {
  return VALUE_LABELS[value] ?? value;
}
