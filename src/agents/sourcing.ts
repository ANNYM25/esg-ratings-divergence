/**
 * Agent 1 — Data Sourcing.
 *
 * Attacks the tool's single biggest weakness: 120 unverified placeholder
 * ratings. Reads genuinely-open published sources and emits structured
 * RatingProposal objects carrying score, scale, as-of date, source URL and a
 * verbatim quote.
 *
 * It NEVER writes to src/data/ratings.ts. Proposals go to the Verifier (Agent
 * 2), and only a human flips `verified`. The agent's job is to do the tedious
 * finding and transcribing, not to decide what is true.
 *
 * Note on coverage: MSCI, Sustainalytics and LSEG are excluded from the
 * allowlist because their ratings are proprietary and their terms prohibit
 * automated retrieval. The agent is expected to report those as blocked rather
 * than route around them — and it is instructed to say so explicitly, because
 * silently returning nothing would look like a bug rather than a boundary.
 */

import { GROUND_RULES, runAgent, researchThenStructure } from "./runtime";
import { researchTools, SOURCE_ALLOWLIST } from "./tools";
import { sourcingResultSchema, type SourcingResult } from "./schemas";

const INSTRUCTIONS = `${GROUND_RULES}

You are the Data Sourcing agent for an ESG ratings divergence tool.

YOUR JOB
Find the currently published ESG rating for a given company from each provider,
and transcribe it precisely, with a citation. You are doing the work of a
research assistant who checks sources — not an analyst who estimates.

WHAT YOU CAN AND CANNOT REACH
The fetchPage tool is restricted to an allowlist: ${SOURCE_ALLOWLIST.join(", ")},
plus companies' own domains. This is deliberate.

MSCI, Morningstar Sustainalytics and LSEG ratings are PROPRIETARY. Their terms
prohibit automated retrieval, so those hosts are blocked and you must not
attempt them. For those three providers, return found:false with a note saying
the source is proprietary and requires a licensed terminal or manual lookup, and
record them in blockedSources. That is the correct outcome, not a failure.

S&P Global publishes CSA scores openly and CDP publishes disclosure scores
openly. Those are where you can genuinely succeed.

METHOD
1. Call getCompanyProfile to confirm the company's identity and sector.
2. Call getProviderMethodology so you know each provider's scale and direction
   before you read any number. Sustainalytics is a RISK score where lower is
   better — misreading that direction is the most common error in this domain.
3. For each reachable provider, fetch the most likely published page and read it.
4. Transcribe the figure exactly as published. Do not convert, round or
   normalise it — the deterministic engine does that.
5. Capture a short verbatim quote containing the figure, and the exact URL.
6. If the page does not state an as-of date, set asOf to null. Do not guess it.

CONFIDENCE
- high    — figure and date both explicitly stated on the provider's own page
- medium  — figure stated but date absent or ambiguous
- low     — figure inferred, or found only on a third-party summary

If you cannot find a figure, say so plainly. An honest "not found" is a useful
result; a plausible invented number would corrupt the dataset and is the single
worst thing you could do here.`;

export async function runSourcing(ticker: string) {
  return runAgent<SourcingResult>("sourcing", "reasoning", (m) =>
    researchThenStructure({
      model: m,
      instructions: INSTRUCTIONS,
      tools: researchTools,
      schema: sourcingResultSchema,
      maxSteps: 24,
      prompt: `Source the currently published ESG ratings for ${ticker.toUpperCase()} from all four providers (MSCI, Sustainalytics, LSEG, S&P Global CSA).

Return one proposal per provider — including the ones you cannot reach, marked found:false with the reason. List every blocked source explicitly.`,
    }),
  );
}
