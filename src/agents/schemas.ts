/**
 * Structured output schemas for every agent.
 *
 * Agents return typed objects, not prose blobs. That is what lets the Verifier
 * audit the Sourcing agent mechanically, and what lets the UI render results
 * without parsing free text.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Agent 1 — Data Sourcing
 * ------------------------------------------------------------------ */

export const ratingProposalSchema = z.object({
  ticker: z.string(),
  provider: z.enum(["msci", "sustainalytics", "lseg", "spcsa"]),
  score: z
    .number()
    .nullable()
    .describe("The score exactly as published, on the provider's own scale. Null if not found."),
  scaleNote: z
    .string()
    .describe("The scale the score is on, restated, so a reviewer can sanity-check it."),
  asOf: z
    .string()
    .nullable()
    .describe("The provider's stated rating date, ISO format. Null if the page does not state one."),
  sourceUrl: z.string().nullable().describe("Exact URL the figure was read from."),
  quote: z
    .string()
    .nullable()
    .describe("Short verbatim excerpt from the source containing the figure."),
  found: z.boolean().describe("Whether a usable published figure was actually located."),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().describe("Anything a reviewer needs to know, including why nothing was found."),
});

export const sourcingResultSchema = z.object({
  proposals: z.array(ratingProposalSchema),
  summary: z.string().describe("One paragraph on what was searched and what was found."),
  blockedSources: z
    .array(z.string())
    .describe("Sources that could not be used, and why — e.g. proprietary and off-allowlist."),
});

export type RatingProposal = z.infer<typeof ratingProposalSchema>;
export type SourcingResult = z.infer<typeof sourcingResultSchema>;

/* ------------------------------------------------------------------ *
 * Agent 2 — Verifier
 * ------------------------------------------------------------------ */

export const verdictSchema = z.object({
  ticker: z.string(),
  provider: z.string(),
  verdict: z
    .enum(["accept", "reject", "uncertain"])
    .describe("accept only if the cited source demonstrably states this figure."),
  reasoning: z.string().describe("Why. Reference what the source did or did not say."),
  checks: z.object({
    sourceReachable: z.boolean(),
    figurePresentInSource: z.boolean(),
    scaleCorrect: z.boolean().describe("Does the figure sit within the provider's declared scale?"),
    asOfDatePresent: z.boolean(),
    sourceIsAuthoritative: z
      .boolean()
      .describe("Is this the provider's own publication rather than a third-party summary?"),
  }),
  correctedScore: z
    .number()
    .nullable()
    .describe("If the proposal misread the figure, the correct one. Otherwise null."),
});

export const verificationResultSchema = z.object({
  verdicts: z.array(verdictSchema),
  accepted: z.number(),
  rejected: z.number(),
  uncertain: z.number(),
  summary: z.string(),
});

export type Verdict = z.infer<typeof verdictSchema>;
export type VerificationResult = z.infer<typeof verificationResultSchema>;

/* ------------------------------------------------------------------ *
 * Agent 3 — Controversy Analyst
 * ------------------------------------------------------------------ */

export const controversyEventSchema = z.object({
  date: z.string().describe("Approximate date, ISO or YYYY-MM."),
  headline: z.string(),
  category: z.enum([
    "environmental",
    "labour",
    "governance",
    "product-safety",
    "privacy",
    "human-rights",
    "regulatory",
    "other",
  ]),
  severity: z.enum(["low", "moderate", "high", "severe"]),
  ongoing: z.boolean(),
  sourceUrl: z.string().nullable(),
});

export const controversyResultSchema = z.object({
  ticker: z.string(),
  currentLevel: z
    .enum(["none", "moderate", "significant", "severe"])
    .describe("Maps directly onto CompanyAttributes.controversy in the rules engine."),
  encodedLevel: z
    .enum(["none", "moderate", "significant", "severe"])
    .describe("The level currently encoded in the dataset, for comparison."),
  changed: z.boolean().describe("True if the assessed level differs from the encoded one."),
  rationale: z.string(),
  events: z.array(controversyEventSchema),
  divergenceImpact: z
    .string()
    .describe(
      "How this level affects divergence: which rating providers' controversy handling it activates and in which direction.",
    ),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ControversyResult = z.infer<typeof controversyResultSchema>;

/* ------------------------------------------------------------------ *
 * Agent 5 — Methodology Watcher
 * ------------------------------------------------------------------ */

export const driftFindingSchema = z.object({
  attribute: z.string().describe("Which encoded ProviderProfile attribute."),
  encodedValue: z.string(),
  observedValue: z.string().describe("What the current published methodology appears to say."),
  drifted: z.boolean(),
  severity: z
    .enum(["none", "cosmetic", "material"])
    .describe("material = would change divergence explanations."),
  evidence: z.string().nullable().describe("Verbatim excerpt supporting the observation."),
  sourceUrl: z.string().nullable(),
});

export const watcherResultSchema = z.object({
  provider: z.string(),
  checkedAt: z.string(),
  sourceReachable: z.boolean(),
  findings: z.array(driftFindingSchema),
  materialDriftCount: z.number(),
  recommendation: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type WatcherResult = z.infer<typeof watcherResultSchema>;
