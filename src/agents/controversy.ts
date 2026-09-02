/**
 * Agent 3 — Controversy Analyst.
 *
 * The `controversy` attribute on each company is one of the strongest levers in
 * the rules engine: it activates the controversy-handling driver, which is
 * frequently the largest single contributor to a divergence gap. Today those
 * levels are hand-set and go stale the moment something happens in the world.
 *
 * This agent re-assesses the level, explains the ratings consequence, and — the
 * part that matters — reports whether its assessment DIFFERS from what is
 * currently encoded. A silent agreement is as useful an output as a change.
 *
 * It proposes. It does not edit src/data/companies.ts.
 */

import { GROUND_RULES, runAgent, researchThenStructure } from "./runtime";
import { researchTools } from "./tools";
import { controversyResultSchema, type ControversyResult } from "./schemas";
import { getCompany } from "@/data/companies";

const INSTRUCTIONS = `${GROUND_RULES}

You are the Controversy Analyst for an ESG ratings divergence tool.

WHY THIS MATTERS
The tool encodes each company's controversy level on a four-point scale, and
that level drives one of the strongest divergence rules. Providers handle
controversies very differently:

- MSCI and LSEG run controversies as a separate OVERLAY that can CAP the whole
  rating regardless of how strong the underlying policies are.
- Sustainalytics and S&P Global DEDUCT points from the affected issue score
  only, so the damage stays contained.

The practical consequence: a severe controversy hurts the capping raters far
more than the deducting raters, and that asymmetry is often the single biggest
reason two providers disagree about a company.

THE SCALE — apply it strictly
- none        — no material outstanding controversies
- moderate    — routine industry-level issues; nothing structural or ongoing
- significant — serious, ongoing, or repeated issues attracting sustained
                regulatory, legal or press attention
- severe      — systemic failure, fatalities, major enforcement action, or an
                existential reputational event

METHOD
1. Call getCompanyProfile to see what is currently encoded and which flags are
   already recorded.
2. Assess the CURRENT state. Weigh severity, whether the issue is ongoing, and
   whether it is structural or one-off. A single old settled matter is not
   "severe"; a pattern of repeated enforcement is.
3. Set encodedLevel to what the dataset currently says and currentLevel to your
   assessment, and set changed accordingly.
4. In divergenceImpact, state concretely which providers this level pushes down
   hardest and why, using the overlay-vs-deduction distinction above.

EVIDENCE
Build the events list from what you actually know or can cite. Where you have no
source URL, set it to null and lower your confidence — do not manufacture a
citation. If your knowledge of recent events is thin, say so in the rationale
and mark confidence low. Being explicit about a stale knowledge cutoff is far
more useful than a confident guess.`;

export async function runControversy(ticker: string) {
  const company = getCompany(ticker);

  return runAgent<ControversyResult>("controversy", "reasoning", (m) =>
    researchThenStructure({
      model: m,
      instructions: INSTRUCTIONS,
      tools: researchTools,
      schema: controversyResultSchema,
      maxSteps: 16,
      prompt: `Assess the current controversy level for ${company?.name ?? ticker} (${ticker.toUpperCase()}).

The dataset currently encodes it as "${company?.attributes.controversy ?? "unknown"}", with these social flags: ${
        company?.attributes.socialFlags.join("; ") || "none"
      }; and these governance flags: ${
        company?.attributes.governanceFlags.join("; ") || "none"
      }.

Tell me whether that encoded level is still right, and what it means for how the four providers will disagree about this company.`,
    }),
  );
}
