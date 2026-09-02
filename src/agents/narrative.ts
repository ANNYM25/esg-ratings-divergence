/**
 * Agent 4 — Narrative Analyst.
 *
 * Turns the deterministic drivers into analyst prose. This is the Tier 2 layer
 * from the original roadmap, and it is the agent with the tightest leash in the
 * system:
 *
 *   It may REPHRASE the supplied drivers. It may not compute a number,
 *   introduce a fact, or reach for anything outside what it was handed.
 *
 * Every figure it is allowed to mention is injected into the prompt from the
 * deterministic engine. It has no tools at all — not even read-only ones —
 * because giving it tools would give it room to go looking for material the
 * rules engine did not sanction, and the whole point of this layer is that its
 * output is a restatement, not a new claim.
 *
 * When no API key is configured, callers fall back to the rules-engine summary,
 * which is already a complete and correct answer — just a blunter one.
 */

import { ToolLoopAgent } from "ai";

import { GROUND_RULES, resolveChain, type ResolvedModel } from "./runtime";
import { computeDivergence, BANDS, PROFILES } from "@/lib/divergence";
import { explain, CATEGORY_LABELS } from "@/lib/explain";
import { normalisedRatingsFor } from "@/lib/normalise";
import { PROVIDERS } from "@/lib/providers";
import { getCompany } from "@/data/companies";
import { SECTORS } from "@/data/companies";

const INSTRUCTIONS = `${GROUND_RULES}

You are an ESG research analyst writing the explanatory note that accompanies a
divergence analysis. Your reader is an investment professional who already
understands ESG ratings and does not need the basics explained.

THE ONE RULE THAT MATTERS
You are given a complete set of computed figures and deterministic drivers. You
may rephrase, sequence and connect them. You may NOT:
  - state any number that was not given to you
  - perform any arithmetic, including differences and percentages
  - introduce any fact about the company that is not in the material provided
  - speculate about what a provider "probably" thinks

If you want to say something you were not given, leave it out.

HOW TO WRITE
- 150-220 words, in flowing prose. No headings, no bullet lists, no markdown.
- Open with the finding, not with preamble. Never begin "This analysis shows".
- Lead with the largest driver and explain the MECHANISM, not just the label —
  the reader wants to know why an industry-relative benchmark produces a
  different answer, not merely that the benchmarks differ.
- Name the providers explicitly. "One rater" is weaker than "MSCI".
- Where the disagreement type is level-only or rank-only, say what that means
  practically: whether it survives sector-relative screening or absolute
  thresholds.
- Close with the practical consequence for someone deciding which rating to use.
- British spelling. No hedging filler ("it is important to note"). No em dashes.

TONE
Measured and specific. You are explaining a real methodological disagreement to
someone who will act on it, not selling a conclusion.`;

/**
 * Uses the "fast" role rather than "reasoning". This agent has no tools and a
 * fully closed prompt, which is the weakest requirement in the system — so it
 * gets the quickest model available rather than the strongest, and the streamed
 * note appears almost immediately.
 */
export function buildNarrativeAgent(m: ResolvedModel) {
  return new ToolLoopAgent({
    model: m.model,
    instructions: INSTRUCTIONS,
    // Deliberately no tools: everything it may reference is in the prompt.
  });
}

/** First usable fast model, or null when nothing is configured. */
export function narrativeModel(): ResolvedModel | null {
  return resolveChain("fast")[0] ?? null;
}

/**
 * Builds the complete, closed set of material the narrative may draw on.
 * If a fact is not in this string, the agent is not permitted to state it.
 */
export function buildNarrativeBrief(ticker: string): string | null {
  const company = getCompany(ticker);
  if (!company) return null;

  const d = computeDivergence(ticker);
  const e = explain(ticker);
  const ratings = normalisedRatingsFor(ticker);

  const lines: string[] = [
    `COMPANY: ${company.name} (${company.ticker})`,
    `SECTOR: ${SECTORS[company.sector].name} — ${company.subIndustry}`,
    "",
    "PROVIDER RATINGS (normalised 0-100, higher is always better):",
    ...ratings.map(
      (r) =>
        `  - ${PROVIDERS[r.provider].shortName}: native "${r.rawLabel}" → ${r.normalised} normalised, sector percentile ${r.sectorPercentile}`,
    ),
    "",
    "DIVERGENCE (computed, do not recalculate):",
    `  composite score: ${d.score} of 100 (${BANDS[d.band].label})`,
    `  level spread: ${d.normalisedRange}`,
    `  rank spread: ${d.percentileRange}`,
    `  disagreement type: ${PROFILES[d.profile].label} — ${PROFILES[d.profile].description}`,
    d.widestPair
      ? `  widest pair: ${PROVIDERS[d.widestPair.a].shortName} vs ${PROVIDERS[d.widestPair.b].shortName}, ${d.widestPair.normalisedDelta} points apart`
      : "",
    "",
    "PILLAR SPREADS:",
    ...Object.entries(d.pillarRanges).map(([k, v]) => `  ${k}: ${v}`),
    "",
    `ATTRIBUTION: measurement ${e.attribution.measurement}%, scope ${e.attribution.scope}%, weight ${e.attribution.weight}%`,
    "",
    "DETERMINISTIC DRIVERS — these are the only permitted explanations:",
    ...e.drivers.map(
      (dr, i) =>
        `  ${i + 1}. [${CATEGORY_LABELS[dr.category].label}, weight ${dr.weight}, ${dr.confidence} confidence] ${dr.title}\n     ${dr.detail}${dr.favours ? `\n     Pushes upward: ${PROVIDERS[dr.favours].shortName}` : ""}`,
    ),
    "",
    "COMPANY ATTRIBUTES:",
    `  disclosure: ${company.attributes.disclosure}`,
    `  controversy: ${company.attributes.controversy}`,
    `  carbon intensity: ${company.attributes.carbonIntensity}`,
    `  product alignment: ${company.attributes.productAlignment}`,
    `  governance flags: ${company.attributes.governanceFlags.join(", ") || "none"}`,
    `  social flags: ${company.attributes.socialFlags.join(", ") || "none"}`,
  ];

  return lines.filter(Boolean).join("\n");
}

/** The deterministic answer, used verbatim when no model is available. */
export function fallbackNarrative(ticker: string): string {
  const e = explain(ticker);
  const top = e.drivers.slice(0, 3);
  return [
    e.summary,
    "",
    ...top.map((d, i) => `${i + 1}. ${d.title} — ${d.detail}`),
  ].join("\n");
}
