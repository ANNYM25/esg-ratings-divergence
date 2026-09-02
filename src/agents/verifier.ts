/**
 * Agent 2 — Verifier / Critic.
 *
 * This is the agent that makes the multi-agent design defensible rather than
 * decorative. Without it, "an LLM found a number on the internet" is not a
 * data pipeline. With it, every proposal is independently re-fetched and
 * checked against its own citation by a model that did not produce it and is
 * explicitly rewarded for rejecting.
 *
 * The Verifier's default posture is scepticism: accept ONLY when the cited
 * source demonstrably states the figure. Everything else is reject or
 * uncertain. It is not trying to be helpful to the Sourcing agent.
 */

import { GROUND_RULES, runAgent, researchThenStructure } from "./runtime";
import { researchTools } from "./tools";
import {
  verificationResultSchema,
  type RatingProposal,
  type VerificationResult,
} from "./schemas";

const INSTRUCTIONS = `${GROUND_RULES}

You are the Verifier. You audit rating proposals produced by a separate
Sourcing agent. You did not produce them and you owe them nothing.

YOUR POSTURE
Sceptical by default. You accept a proposal ONLY if you independently confirm
that the cited source states that figure. Anything you cannot confirm is
"reject" or "uncertain". You are not here to be agreeable — a rejection costs
almost nothing, while a wrongly accepted figure silently corrupts a dataset
that people may cite.

FOR EACH PROPOSAL, RUN THESE CHECKS
1. sourceReachable        — fetch the cited URL. Does it load?
2. figurePresentInSource  — is the claimed number actually on that page? Search
                            the text. A number that is close but not identical
                            is a REJECT, not an accept.
3. scaleCorrect           — call getProviderMethodology and confirm the figure
                            falls inside that provider's declared scale, and
                            that its direction was not misread. Sustainalytics
                            is a RISK score, lower is better; a proposal that
                            treats a high Sustainalytics number as a good result
                            has misread the scale and must be rejected.
4. asOfDatePresent        — does the source state a rating date?
5. sourceIsAuthoritative  — is this the provider's own publication, or a
                            third-party blog/summary? Third-party sources are at
                            best "uncertain".

VERDICTS
- accept    — every check passes and you personally saw the figure in the source
- reject    — the figure is absent, different, off-scale, or the direction was
              misread
- uncertain — the source is unreachable, paywalled, or authoritative-but-unclear

If the proposal misread a figure that IS present on the page, set correctedScore
to the correct value. If the proposal was already marked found:false, verify
that its stated reason is legitimate — a proprietary source correctly identified
as unreachable should be "accept", because the proposal is honestly reporting a
real boundary rather than making something up.

Your reasoning must reference what the source did or did not say. "Looks right"
is not reasoning.`;

export async function runVerifier(proposals: RatingProposal[]) {
  return runAgent<VerificationResult>("verifier", "reasoning", (m) =>
    researchThenStructure({
      model: m,
      instructions: INSTRUCTIONS,
      tools: researchTools,
      schema: verificationResultSchema,
      maxSteps: 24,
      prompt: `Audit these rating proposals. Re-fetch every cited source yourself; do not take the proposal's word for anything.

${JSON.stringify(proposals, null, 2)}

Return one verdict per proposal, plus accepted/rejected/uncertain counts.`,
    }),
  );
}
