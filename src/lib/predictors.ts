/**
 * What predicts divergence?
 *
 * ───────────────────────────────────────────────────────────────────────────
 * The tool has so far answered "which companies do the raters disagree about".
 * That is description. The research question is "what KIND of company do they
 * systematically disagree about" — because that is what turns the tool from a
 * lookup into something with a testable claim behind it.
 *
 * The hypothesis is specific and falsifiable: divergence should be highest
 * where raters have the most room to exercise judgement. That predicts
 *
 *   - LOW-DISCLOSURE companies diverge more, because raters must fill the gap,
 *     and they fill it differently (imputation versus penalty).
 *   - CONTESTED-PRODUCT companies diverge more, because whether the product
 *     itself counts is a scope question raters answer differently.
 *   - HIGH-CONTROVERSY companies diverge more, because overlay-capping and
 *     point-deduction produce very different magnitudes from one event.
 *
 * If those hold, divergence is not random noise: it is a predictable
 * consequence of specific methodology choices meeting specific company
 * characteristics. That is a finding worth stating.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Method note. With thirty companies this is a small-sample group comparison,
 * not a regression, and it is reported as such: group means with bootstrap
 * intervals and a standardised effect size. Fitting a multivariate model to
 * n=30 across four correlated predictors would produce coefficients nobody
 * should believe.
 */

import { COMPANIES } from "@/data/companies";
import { computeDivergence } from "./divergence";
import { round } from "./normalise";
import { bootstrap, mean, stdev, type Interval } from "./statistics";
import type { Company } from "./types";

/**
 * Minimum group size for a comparison to be reportable.
 *
 * Without this guard the disclosure test compared a group of one against a
 * group of eighteen and reported a "finding". A single company is not a group:
 * its bootstrap interval collapses onto itself, its standard deviation is
 * undefined, and any effect size computed from it is meaningless. Groups below
 * this threshold are still shown — hiding them would be its own distortion —
 * but they are excluded from the effect-size comparison and flagged.
 */
export const MIN_GROUP_N = 3;

export interface Group {
  label: string;
  n: number;
  meanDivergence: Interval;
  tickers: string[];
  /** True when n < MIN_GROUP_N, so the reader knows not to lean on it. */
  underpowered: boolean;
}

export interface PredictorResult {
  id: string;
  /** The company attribute being tested. */
  attribute: string;
  /** The hypothesis, stated before the numbers. */
  hypothesis: string;
  /** Which methodology attribute this interacts with. */
  mechanism: string;
  groups: Group[];
  /** Difference between the highest and lowest group means. */
  spread: number;
  /** Cohen's d between the extreme groups. */
  effectSize: number;
  effectLabel: "negligible" | "small" | "medium" | "large";
  /** Whether the intervals of the extreme groups fail to overlap. */
  separated: boolean;
  /** Did the data behave as the hypothesis predicted? */
  supported: boolean;
  /** True when any group fell below MIN_GROUP_N — read the result cautiously. */
  hasUnderpoweredGroups: boolean;
  /** Groups actually used for the effect-size comparison. */
  comparedGroups: [string, string] | null;
  finding: string;
}

function divergenceOf(c: Company): number {
  return computeDivergence(c.ticker).score;
}

function buildGroup(label: string, members: Company[]): Group {
  const scores = members.map(divergenceOf);
  return {
    label,
    n: members.length,
    meanDivergence: bootstrap(scores),
    tickers: members.map((m) => m.ticker),
    underpowered: members.length < MIN_GROUP_N,
  };
}

/** Cohen's d with a pooled standard deviation. */
function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const sa = stdev(a);
  const sb = stdev(b);
  const pooled = Math.sqrt(
    ((a.length - 1) * sa ** 2 + (b.length - 1) * sb ** 2) /
      (a.length + b.length - 2),
  );
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}

function labelEffect(d: number): PredictorResult["effectLabel"] {
  const abs = Math.abs(d);
  if (abs < 0.2) return "negligible";
  if (abs < 0.5) return "small";
  if (abs < 0.8) return "medium";
  return "large";
}

function analyse(
  id: string,
  attribute: string,
  hypothesis: string,
  mechanism: string,
  buckets: Array<{ label: string; members: Company[] }>,
  /** The bucket label expected to show the HIGHEST divergence. */
  expectedHighest: string,
): PredictorResult {
  const groups = buckets
    .filter((b) => b.members.length > 0)
    .map((b) => buildGroup(b.label, b.members));

  // Effect size is computed only across adequately-powered groups.
  const usable = groups.filter((g) => !g.underpowered);
  const ranked = [...(usable.length >= 2 ? usable : groups)].sort(
    (a, b) => b.meanDivergence.estimate - a.meanDivergence.estimate,
  );
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];

  const topScores = top.tickers.map((t) => computeDivergence(t).score);
  const bottomScores = bottom.tickers.map((t) => computeDivergence(t).score);

  const d = cohensD(topScores, bottomScores);
  const spread = round(
    top.meanDivergence.estimate - bottom.meanDivergence.estimate,
    1,
  );
  const separated =
    top.meanDivergence.low > bottom.meanDivergence.high ||
    bottom.meanDivergence.low > top.meanDivergence.high;

  // The hypothesis is judged on ALL groups, including small ones — excluding a
  // group from the effect size is a precision decision, not licence to ignore
  // where it actually landed.
  const byMean = [...groups].sort(
    (a, b) => b.meanDivergence.estimate - a.meanDivergence.estimate,
  );
  const supported = byMean[0].label === expectedHighest;
  const hasUnderpoweredGroups = groups.some((g) => g.underpowered);

  const finding = supported
    ? `${top.label} companies diverge ${spread} points more than ${bottom.label} (${top.meanDivergence.estimate} vs ${bottom.meanDivergence.estimate}), a ${labelEffect(d)} effect${separated ? " with non-overlapping intervals" : ", though the intervals overlap"}.`
    : `The prediction did not hold. ${top.label} shows the highest divergence (${top.meanDivergence.estimate}), not ${expectedHighest}. Difference across groups is ${spread} points, a ${labelEffect(d)} effect.`;

  const caveat = hasUnderpoweredGroups
    ? ` One or more groups fall below n=${MIN_GROUP_N} and are excluded from the effect-size comparison.`
    : "";

  return {
    id,
    attribute,
    hypothesis,
    mechanism,
    groups,
    spread,
    effectSize: round(d, 2),
    effectLabel: labelEffect(d),
    separated,
    supported,
    hasUnderpoweredGroups,
    comparedGroups: [top.label, bottom.label],
    finding: finding + caveat,
  };
}

/* ------------------------------------------------------------------ *
 * The tests
 * ------------------------------------------------------------------ */

export function analysePredictors(): PredictorResult[] {
  const by = <K extends string>(
    pick: (c: Company) => K,
    values: K[],
    labels: Record<K, string>,
  ) =>
    values.map((v) => ({
      label: labels[v],
      members: COMPANIES.filter((c) => pick(c) === v),
    }));

  return [
    analyse(
      "disclosure",
      "Disclosure level",
      "Companies that disclose less should diverge more, because raters must fill the gap and they fill it differently.",
      "Non-disclosure treatment: LSEG and S&P score an unanswered metric as a failure, while MSCI imputes an estimate from peers. With a thin reporter the two approaches produce very different scores from identical evidence.",
      by(
        (c) => c.attributes.disclosure,
        ["low", "medium", "high"],
        { low: "Low disclosure", medium: "Medium disclosure", high: "High disclosure" },
      ),
      "Low disclosure",
    ),

    analyse(
      "product",
      "Product alignment",
      "Companies whose product is itself contested should diverge more, because whether the product counts is a scope question raters answer differently.",
      "Materiality lens: a double-materiality rater credits or penalises the product's effect on the world; a financial-materiality rater largely ignores it until it becomes a regulatory or litigation cost.",
      by(
        (c) => c.attributes.productAlignment,
        ["negative", "positive", "neutral"],
        {
          negative: "Product harms",
          positive: "Product helps",
          neutral: "Product neutral",
        },
      ),
      "Product harms",
    ),

    analyse(
      "controversy",
      "Controversy severity",
      "Companies with severe controversies should diverge more, because capping and deducting produce very different magnitudes from one event.",
      "Controversy handling: MSCI and LSEG run a separate overlay that can cap the entire rating; Sustainalytics and S&P deduct from the affected issue only, so the damage stays contained.",
      by(
        (c) => c.attributes.controversy,
        ["severe", "significant", "moderate", "none"],
        {
          severe: "Severe",
          significant: "Significant",
          moderate: "Moderate",
          none: "None",
        },
      ),
      "Severe",
    ),

    analyse(
      "carbon",
      "Carbon intensity",
      "Carbon-intensive companies should diverge more, because absolute and industry-relative benchmarks treat sector exposure in opposite ways.",
      "Benchmark basis: Sustainalytics scores on an absolute cross-industry scale so sector exposure flows straight through; MSCI and LSEG grade against industry peers, so a heavy emitter can still rate well for its sector.",
      by(
        (c) => c.attributes.carbonIntensity,
        ["high", "medium", "low"],
        { high: "High carbon", medium: "Medium carbon", low: "Low carbon" },
      ),
      "High carbon",
    ),
  ];
}

export interface PredictorSummary {
  results: PredictorResult[];
  supported: number;
  total: number;
  /** The predictor with the largest effect. */
  strongest: PredictorResult;
  /** Overall read, stated in one sentence. */
  conclusion: string;
}

export function predictorSummary(): PredictorSummary {
  const results = analysePredictors();
  const supported = results.filter((r) => r.supported).length;
  // Rank by effect size, but prefer results whose intervals actually separate —
  // a large d with overlapping intervals is not something to lead with.
  const strongest = [...results].sort((a, b) => {
    if (a.separated !== b.separated) return a.separated ? -1 : 1;
    return Math.abs(b.effectSize) - Math.abs(a.effectSize);
  })[0];

  const conclusion =
    supported >= 3
      ? `Divergence is systematic, not random. ${supported} of ${results.length} pre-stated hypotheses hold, and the strongest predictor is ${strongest.attribute.toLowerCase()} (Cohen's d ${strongest.effectSize}). Rater disagreement concentrates precisely where methodology choices have the most room to bite, which means it is forecastable from company characteristics before any rating is consulted.`
      : `Results are mixed: ${supported} of ${results.length} pre-stated hypotheses hold. The strongest predictor is ${strongest.attribute.toLowerCase()} (Cohen's d ${strongest.effectSize}). With thirty companies these group comparisons are underpowered, and the honest read is that the direction is suggestive rather than established.`;

  return { results, supported, total: results.length, strongest, conclusion };
}
