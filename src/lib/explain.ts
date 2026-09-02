/**
 * Phase 5, Tier 1 — Deterministic explanation engine.
 *
 * This engine knows nothing about ESG. It mechanically diffs two providers'
 * methodology profiles, checks each difference against the company's own
 * attributes, and emits structured drivers. No model, no API call, no
 * randomness — the same inputs always produce the same explanation, and every
 * claim traces back to a named methodology attribute.
 *
 * Each driver is attributed to one of the three categories from Berg, Kölbel &
 * Rigobon (2022), "Aggregate Confusion: The Divergence of ESG Ratings":
 *
 *   SCOPE       — the providers are measuring different attributes
 *   MEASUREMENT — same attribute, different indicator or data source
 *   WEIGHT      — same attributes, different importance
 *
 * Their finding was that measurement divergence accounts for roughly 56% of
 * total divergence, scope 38%, and weight 6%. The attribution block this
 * engine returns is directly comparable to that decomposition.
 *
 * Tier 2 (the Claude narrative layer, in app/api/explain) consumes these
 * drivers verbatim. It is permitted to rephrase them. It is never permitted to
 * compute a number or introduce a fact that is not present here.
 */

import { getCompany } from "@/data/companies";
import { PROVIDERS } from "./providers";
import { computeDivergence } from "./divergence";
import { normalisedRatingsFor } from "./normalise";
import type {
  Company,
  DivergenceCategory,
  DivergenceDriver,
  Explanation,
  ProviderId,
  ProviderProfile,
} from "./types";

interface RuleContext {
  company: Company;
  /** The higher-scoring provider of the pair. */
  high: ProviderProfile;
  /** The lower-scoring provider of the pair. */
  low: ProviderProfile;
  gap: number;
}

type Rule = (ctx: RuleContext) => DivergenceDriver | null;

const has = (list: string[]) => list.length > 0;

/* ------------------------------------------------------------------ *
 * Rules
 * ------------------------------------------------------------------ */

const RULES: Rule[] = [
  /* ---- SCOPE ---- */

  // Industry-relative vs absolute. The dominant driver in heavy sectors.
  ({ company, high, low }) => {
    if (high.benchmark === low.benchmark) return null;
    const relative = high.benchmark === "industry_relative" ? high : low;
    const absolute = relative.id === high.id ? low : high;
    const heavy =
      company.attributes.carbonIntensity === "high" ||
      company.attributes.productAlignment === "negative";

    return {
      id: "benchmark_basis",
      category: "scope",
      attribute: "Benchmark basis",
      title: "One rater grades on a curve, the other does not",
      detail: `${relative.shortName} scores ${company.name} against its ${company.subIndustry} peers, so a good score means "well managed for this industry". ${absolute.shortName} scores on an absolute scale that applies across every sector, so ${heavy ? "the sector's inherent exposure flows straight through to the result" : "sector context is not credited"}. These are answers to two different questions, not two answers to one question.`,
      favours: relative.id,
      weight: heavy ? 34 : 18,
      confidence: "high",
    };
  },

  // Risk framing vs performance framing.
  ({ high, low, company }) => {
    if (high.framing === low.framing) return null;
    const risk = high.framing === "risk_exposure" ? high : low;
    const perf = risk.id === high.id ? low : high;

    return {
      id: "framing",
      category: "scope",
      attribute: "What the score measures",
      title: "Risk exposure versus management quality",
      detail: `${risk.shortName} measures how much unmanaged ESG risk remains on the balance sheet. ${perf.shortName} measures how well the company manages the ESG issues it faces. A company can manage its risks diligently and still carry a great deal of residual exposure — ${company.name} in ${company.subIndustry} is exactly that case — which is why one rater can look favourable while the other does not.`,
      favours: perf.id,
      weight: 22,
      confidence: "high",
    };
  },

  // Single vs double materiality — bites hardest when the product itself is
  // the issue.
  ({ high, low, company }) => {
    if (high.materiality === low.materiality) return null;
    if (company.attributes.productAlignment === "neutral") return null;
    const double = high.materiality === "double" ? high : low;
    const single = double.id === high.id ? low : high;
    const positive = company.attributes.productAlignment === "positive";

    return {
      id: "materiality_lens",
      category: "scope",
      attribute: "Materiality lens",
      title: positive
        ? "Only one rater credits the product itself"
        : "Only one rater counts the product's impact",
      detail: `${double.shortName} applies a double-materiality lens that captures the company's impact on the world, not only the world's impact on the company. ${single.shortName} restricts itself to what affects enterprise value. ${company.name}'s product is ${positive ? "a net contributor to sustainability outcomes, which earns credit under a double-materiality lens and close to none under a financial-materiality one" : "a source of downstream harm that a financial-materiality lens will largely ignore unless and until it becomes a regulatory or litigation cost"}.`,
      favours: positive ? double.id : single.id,
      weight: 20,
      confidence: "medium",
    };
  },

  /* ---- MEASUREMENT ---- */

  // Disclosure treatment. The single biggest driver for thin reporters.
  ({ high, low, company }) => {
    if (high.disclosure === low.disclosure) return null;
    const disclosure = company.attributes.disclosure;
    if (disclosure === "high") return null;

    const penalising = high.disclosure === "penalised" ? high : low;
    const forgiving = penalising.id === high.id ? low : high;

    return {
      id: "disclosure_treatment",
      category: "measurement",
      attribute: "Non-disclosure treatment",
      title: "A reporting gap is scored as a failure by one rater only",
      detail: `${company.name}'s sustainability reporting is ${disclosure}. ${penalising.shortName} treats an unanswered metric as a failed metric — ${penalising.dataMix.selfReported}% of its inputs are company-reported, so a thin report mechanically produces a thin score. ${forgiving.shortName} ${forgiving.disclosure === "imputed" ? "fills the gap with a modelled estimate drawn from peers" : "drops the indicator and redistributes its weight"}. The difference measures reporting capacity, not underlying performance.`,
      favours: forgiving.id,
      weight: disclosure === "low" ? 32 : 20,
      confidence: "high",
    };
  },

  // Controversy handling — only fires when there is a controversy to handle.
  ({ high, low, company }) => {
    const level = company.attributes.controversy;
    if (level === "none" || level === "moderate") return null;
    if (high.controversy === low.controversy) return null;

    const capping = high.controversy === "overlay_cap" ? high : low;
    const deducting = capping.id === high.id ? low : high;

    return {
      id: "controversy_handling",
      category: "measurement",
      attribute: "Controversy handling",
      title: "The same incident is absorbed very differently",
      detail: `${company.name} carries ${level} outstanding controversies${has(company.attributes.socialFlags) ? ` (${company.attributes.socialFlags.slice(0, 2).join(", ")})` : ""}. ${capping.shortName} runs controversies as a separate overlay that can cap the entire rating regardless of how strong the underlying policies are. ${deducting.shortName} deducts points from the affected issue score only, so the damage stays contained. One rater lets a single incident dominate; the other lets it dilute.`,
      favours: deducting.id,
      weight: level === "severe" ? 30 : 22,
      confidence: "high",
    };
  },

  // Self-reported vs modelled input mix.
  ({ high, low }) => {
    const gap = Math.abs(high.dataMix.selfReported - low.dataMix.selfReported);
    if (gap < 25) return null;
    const reported =
      high.dataMix.selfReported > low.dataMix.selfReported ? high : low;
    const modelled = reported.id === high.id ? low : high;

    return {
      id: "data_mix",
      category: "measurement",
      attribute: "Input data mix",
      title: "Different evidence bases entirely",
      detail: `${reported.shortName} draws ${reported.dataMix.selfReported}% of its inputs from company-reported disclosure. ${modelled.shortName} draws ${modelled.dataMix.selfReported}% reported and ${modelled.dataMix.modelled}% modelled or estimated, with ${modelled.dataMix.mediaAndNgo}% from media and NGO sources. They are reading different evidence about the same company, so a gap between them is expected even where they agree on what matters.`,
      weight: 16,
      confidence: "high",
    };
  },

  // Update cadence — only matters when something has actually happened.
  ({ high, low, company }) => {
    if (high.cadence === low.cadence) return null;
    const level = company.attributes.controversy;
    if (level === "none") return null;

    const continuous = high.cadence === "continuous" ? high : low;
    const annual = continuous.id === high.id ? low : high;

    return {
      id: "update_cadence",
      category: "measurement",
      attribute: "Update cadence",
      title: "One rating may simply be older than the other",
      detail: `${continuous.shortName} updates continuously as new information arrives. ${annual.shortName} runs an annual assessment cycle. With ${level} controversies in play, part of the gap may be timing rather than judgement — the annual score can reflect a state of the world that the continuous score has already moved past.`,
      weight: level === "severe" ? 18 : 12,
      confidence: "medium",
    };
  },

  /* ---- WEIGHT ---- */

  // Governance weighting, triggered by actual governance flags.
  ({ high, low, company }) => {
    const flags = company.attributes.governanceFlags;
    if (!has(flags)) return null;

    return {
      id: "governance_weight",
      category: "weight",
      attribute: "Weighting scheme",
      title: "Governance flags land with different force",
      detail: `${company.name} carries governance concerns a rater would flag: ${flags.join(", ")}. ${high.shortName} uses ${high.weighting.toLowerCase()} ${low.shortName} uses ${low.weighting.toLowerCase()} Because governance sits at a different weight in each scheme, the same underlying facts move the two scores by different amounts.`,
      weight: flags.length >= 2 ? 16 : 10,
      confidence: "medium",
    };
  },

  // Baseline weighting difference — always present, small.
  ({ high, low }) => ({
    id: "weight_baseline",
    category: "weight",
    attribute: "Weighting scheme",
    title: "Issue weights differ by construction",
    detail: `Even where both raters examine the same issue, they assign it different importance. ${high.shortName}: ${high.weighting} ${low.shortName}: ${low.weighting} The literature finds weight divergence is the smallest of the three sources — it rarely explains a large gap on its own, but it is never zero.`,
    weight: 6,
    confidence: "high",
  }),
];

/* ------------------------------------------------------------------ *
 * Engine
 * ------------------------------------------------------------------ */

function summarise(
  company: Company,
  high: ProviderProfile,
  low: ProviderProfile,
  gap: number,
  band: string,
  top: DivergenceDriver | undefined,
): string {
  if (gap < 1) {
    return `${high.shortName} and ${low.shortName} land within a point of each other on ${company.name}. Methodology differences exist but are not biting here.`;
  }

  const lead = top
    ? ` The largest single contributor is ${top.attribute.toLowerCase()}: ${top.title.toLowerCase()}.`
    : "";

  const BAND_PHRASE: Record<string, string> = {
    aligned: "which the composite still scores as broad agreement",
    mild: "a mild divergence",
    significant: "a significant divergence",
    extreme: "an extreme divergence",
  };

  return `${high.shortName} rates ${company.name} ${gap.toFixed(1)} points higher than ${low.shortName} on the common 0–100 scale — ${BAND_PHRASE[band] ?? "a divergence"}.${lead}`;
}

export function explain(ticker: string, pair?: [ProviderId, ProviderId]): Explanation {
  const company = getCompany(ticker);
  if (!company) {
    return {
      ticker: ticker.toUpperCase(),
      summary: "No company found for this ticker.",
      drivers: [],
      attribution: { scope: 0, measurement: 0, weight: 0 },
    };
  }

  const divergence = computeDivergence(ticker);
  const ratings = normalisedRatingsFor(ticker);

  // Default to the pair that disagrees most sharply — that is the case worth
  // explaining. Callers can request any specific pair instead.
  const chosen: [ProviderId, ProviderId] | null = pair
    ? pair
    : divergence.widestPair
      ? [divergence.widestPair.a, divergence.widestPair.b]
      : null;

  if (!chosen) {
    return {
      ticker: company.ticker,
      summary: `Only ${ratings.length} provider rates ${company.name}. Divergence cannot be assessed with a single rating.`,
      drivers: [],
      attribution: { scope: 0, measurement: 0, weight: 0 },
    };
  }

  const first = ratings.find((r) => r.provider === chosen[0]);
  const second = ratings.find((r) => r.provider === chosen[1]);
  if (!first || !second) {
    return {
      ticker: company.ticker,
      summary: "Insufficient ratings to compare this pair.",
      drivers: [],
      attribution: { scope: 0, measurement: 0, weight: 0 },
    };
  }

  const [higher, lower] =
    first.normalised >= second.normalised ? [first, second] : [second, first];

  const ctx: RuleContext = {
    company,
    high: PROVIDERS[higher.provider],
    low: PROVIDERS[lower.provider],
    gap: Math.abs(higher.normalised - lower.normalised),
  };

  const drivers = RULES.map((rule) => rule(ctx))
    .filter((d): d is DivergenceDriver => d !== null)
    .sort((a, b) => b.weight - a.weight);

  // Normalise the raw rule weights into a percentage attribution by category,
  // directly comparable to the Berg et al. decomposition.
  const totals: Record<DivergenceCategory, number> = {
    scope: 0,
    measurement: 0,
    weight: 0,
  };
  for (const d of drivers) totals[d.category] += d.weight;
  const grand = totals.scope + totals.measurement + totals.weight;

  const attribution: Record<DivergenceCategory, number> =
    grand === 0
      ? { scope: 0, measurement: 0, weight: 0 }
      : {
          scope: Math.round((totals.scope / grand) * 100),
          measurement: Math.round((totals.measurement / grand) * 100),
          weight: Math.round((totals.weight / grand) * 100),
        };

  return {
    ticker: company.ticker,
    summary: summarise(
      company,
      ctx.high,
      ctx.low,
      ctx.gap,
      divergence.band,
      drivers[0],
    ),
    drivers,
    attribution,
  };
}

/** The published reference decomposition, for side-by-side comparison. */
export const LITERATURE_ATTRIBUTION: Record<DivergenceCategory, number> = {
  measurement: 56,
  scope: 38,
  weight: 6,
};

export const CATEGORY_LABELS: Record<
  DivergenceCategory,
  { label: string; description: string }
> = {
  scope: {
    label: "Scope",
    description: "The providers are measuring different attributes.",
  },
  measurement: {
    label: "Measurement",
    description: "Same attribute, different indicator or data source.",
  },
  weight: {
    label: "Weight",
    description: "Same attributes, different importance assigned.",
  },
};
