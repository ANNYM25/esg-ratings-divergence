/**
 * Core domain model for the ESG Ratings Aggregator & Divergence Analyser.
 *
 * Design rule: every rating that enters the system carries its own provenance.
 * A score without a source and an as-of date is not admissible.
 */

export type ProviderId = "msci" | "sustainalytics" | "lseg" | "spcsa";

export type Pillar = "environmental" | "social" | "governance";

export type SectorId =
  | "energy"
  | "technology"
  | "consumer"
  | "financials"
  | "industrials";

/* ------------------------------------------------------------------ *
 * Provider methodology profile (Phase 1)
 * ------------------------------------------------------------------ */

/** Which direction the raw number runs. */
export type ScaleDirection = "higher_better" | "lower_better";

/** What the rating is fundamentally trying to express. */
export type Framing =
  /** Exposure to unmanaged ESG risk — a risk metric, like a credit rating. */
  | "risk_exposure"
  /** Quality of ESG management relative to opportunity — a performance metric. */
  | "performance_management";

/** What the score is measured against. */
export type BenchmarkBasis =
  /** Scored against industry peers; a good score means "good for an oil major". */
  | "industry_relative"
  /** Scored on a universal scale; sector risk flows straight through. */
  | "absolute";

/** Whose interests the materiality map serves. */
export type MaterialityLens =
  /** Only ESG issues that affect enterprise value. */
  | "financial_single"
  /** Both financial impact and the company's impact on the world. */
  | "double";

/** How a company that simply does not report is treated. */
export type DisclosureTreatment =
  /** Non-disclosure is scored as failure. Rewards reporting capacity. */
  | "penalised"
  /** Gaps are filled with modelled estimates from peers. */
  | "imputed"
  /** Indicator is dropped and weights redistributed. */
  | "neutral";

/** How scandals and incidents enter the score. */
export type ControversyTreatment =
  /** A separate overlay that can cap or override the underlying score. */
  | "overlay_cap"
  /** Points subtracted directly from the relevant issue score. */
  | "direct_deduction"
  /** Folded into the management-quality assessment itself. */
  | "integrated";

export type UpdateCadence = "continuous" | "annual";

export interface RatingBucket {
  label: string;
  /** Lower bound on the provider's own native scale, inclusive. */
  min: number;
  /** Upper bound on the provider's own native scale, inclusive. */
  max: number;
}

export interface ProviderProfile {
  id: ProviderId;
  name: string;
  shortName: string;
  owner: string;
  /** Accent colour token used consistently across every chart and card. */
  accent: string;

  scale: {
    kind: "letter_bucket" | "risk_score" | "performance_score";
    min: number;
    max: number;
    direction: ScaleDirection;
    unit: string;
    /** Present only for bucketed scales such as MSCI's AAA–CCC ladder. */
    buckets?: RatingBucket[];
    /**
     * Practical ceiling used for normalisation, where the theoretical maximum
     * is never observed. Sustainalytics runs 0–100 in principle but virtually
     * all rated companies fall below 50.
     */
    practicalMax?: number;
  };

  framing: Framing;
  benchmark: BenchmarkBasis;
  materiality: MaterialityLens;
  disclosure: DisclosureTreatment;
  controversy: ControversyTreatment;
  cadence: UpdateCadence;

  /** Rough share of inputs by origin. Sums to 100. */
  dataMix: {
    selfReported: number;
    mediaAndNgo: number;
    modelled: number;
  };

  /** One-line description of the weighting scheme. */
  weighting: string;
  /** How the provider describes its own output, in its own words. */
  selfDescription: string;
  /** Public methodology reference. */
  sourceUrl: string;
}

/* ------------------------------------------------------------------ *
 * Company + ratings
 * ------------------------------------------------------------------ */

export type Level = "low" | "medium" | "high";
export type ControversyLevel = "none" | "moderate" | "significant" | "severe";

/**
 * Qualitative company attributes that drive the explanation engine.
 * These are the levers that make providers disagree, encoded so the rules
 * engine can reason about them mechanically rather than by vibes.
 */
export interface CompanyAttributes {
  /** Breadth and quality of sustainability reporting. */
  disclosure: Level;
  /** Severity of outstanding controversies and incidents. */
  controversy: ControversyLevel;
  /** Operational carbon intensity relative to the whole market. */
  carbonIntensity: Level;
  /**
   * Does the product itself help or hurt sustainability outcomes?
   * The single biggest source of scope divergence.
   */
  productAlignment: "positive" | "neutral" | "negative";
  /** Governance concerns a rater would flag. */
  governanceFlags: string[];
  /** Human-capital and supply-chain concerns a rater would flag. */
  socialFlags: string[];
}

export interface Company {
  ticker: string;
  name: string;
  sector: SectorId;
  subIndustry: string;
  country: string;
  marketCapUsdB: number;
  attributes: CompanyAttributes;
}

export type ProvenanceKind =
  /** Transcribed from the provider's own public disclosure. Trustworthy. */
  | "provider_public"
  /** Derived from a licensed terminal or data feed. */
  | "licensed_feed"
  /** Structurally realistic placeholder. NOT a real rating. */
  | "illustrative";

export interface RatingRecord {
  ticker: string;
  provider: ProviderId;
  /** The score exactly as the provider publishes it, on the provider's scale. */
  rawScore: number;
  /** Native label where the provider issues one (e.g. "AA", "Medium Risk"). */
  rawLabel?: string;
  /** Pillar-level scores on the provider's own scale, where published. */
  pillars?: Record<Pillar, number>;
  asOf: string;
  provenance: ProvenanceKind;
  sourceUrl?: string;
  retrievedAt: string;
  /** False until a human has checked this record against the source. */
  verified: boolean;
  notes?: string;
}

/* ------------------------------------------------------------------ *
 * Derived analytics
 * ------------------------------------------------------------------ */

export interface NormalisedRating {
  provider: ProviderId;
  raw: number;
  rawLabel?: string;
  /** Common 0–100 scale, higher is always better. */
  normalised: number;
  /**
   * Uncertainty interval on the normalised scale. Wide for bucketed scales
   * such as MSCI, where a letter grade is an interval and not a point.
   */
  band: { low: number; high: number };
  /** Rank within the company's own sector, 0–100. Higher is better. The
   * analytically correct comparison, and the one the UI displays. */
  sectorPercentile: number;
  /** Rank across the whole 30-company universe. Coarser conceptually but far
   * more granular (3.3-point steps vs 16.7), so the divergence score's rank
   * component is computed from this to avoid small-sample artefacts. */
  universePercentile: number;
  pillars?: Record<Pillar, number>;
  provenance: ProvenanceKind;
  verified: boolean;
  asOf: string;
}

export type DivergenceBand = "aligned" | "mild" | "significant" | "extreme";

/**
 * Which *kind* of disagreement this is. Two companies can share a divergence
 * score while posing entirely different problems: one where the providers
 * agree on peer ranking but not absolute level, and one where they cannot
 * agree on either.
 */
export type DisagreementProfile = "none" | "level" | "rank" | "both";

export interface PairwiseDelta {
  a: ProviderId;
  b: ProviderId;
  /** Absolute gap on the normalised 0–100 scale. */
  normalisedDelta: number;
  /** Absolute gap in sector percentile terms. */
  percentileDelta: number;
}

export interface DivergenceResult {
  ticker: string;
  /** Composite 0–100. Formula is published in lib/divergence.ts. */
  score: number;
  band: DivergenceBand;
  profile: DisagreementProfile;
  normalisedRange: number;
  percentileRange: number;
  stdDev: number;
  pairs: PairwiseDelta[];
  /** The two providers that disagree most sharply. */
  widestPair: PairwiseDelta | null;
  highest: { provider: ProviderId; normalised: number } | null;
  lowest: { provider: ProviderId; normalised: number } | null;
  /** Per-pillar disagreement, where pillar data exists. */
  pillarRanges: Partial<Record<Pillar, number>>;
  providerCount: number;
}

/* ------------------------------------------------------------------ *
 * Explanation engine
 * ------------------------------------------------------------------ */

/**
 * Berg, Kölbel & Rigobon (2022) decomposition. Every driver the engine emits
 * is attributed to exactly one of these three categories.
 */
export type DivergenceCategory = "scope" | "measurement" | "weight";

export interface DivergenceDriver {
  id: string;
  category: DivergenceCategory;
  /** The methodology attribute responsible. */
  attribute: string;
  title: string;
  /** What each provider does differently, plainly stated. */
  detail: string;
  /** Which provider this pushes up, if the direction is determinate. */
  favours?: ProviderId;
  /** Rough contribution to the observed gap, 0–100. */
  weight: number;
  confidence: "high" | "medium" | "low";
}

export interface Explanation {
  ticker: string;
  summary: string;
  drivers: DivergenceDriver[];
  /** Share of explained divergence by category. Sums to 100. */
  attribution: Record<DivergenceCategory, number>;
}
