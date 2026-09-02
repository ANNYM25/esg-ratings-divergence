/**
 * Agent 5 — Methodology Watcher.
 *
 * Answers a standing risk that is invisible until it bites: the encoded
 * ProviderProfile attributes are a snapshot. Providers revise their
 * methodologies — weights change, controversy overlays get restructured,
 * disclosure treatment shifts — and when they do, every explanation this tool
 * produces quietly becomes wrong while continuing to look authoritative.
 *
 * The Watcher re-reads each provider's published methodology and compares it,
 * attribute by attribute, against what is encoded in src/lib/providers.ts.
 *
 * It grades drift as cosmetic or material, where "material" means it would
 * change the divergence explanations the rules engine emits. That distinction
 * is the useful output — a provider rewording its marketing copy is noise; a
 * provider changing from an overlay to a deduction model is not.
 */

import { GROUND_RULES, runAgent, researchThenStructure } from "./runtime";
import { researchTools } from "./tools";
import { watcherResultSchema, type WatcherResult } from "./schemas";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

const INSTRUCTIONS = `${GROUND_RULES}

You are the Methodology Watcher for an ESG ratings divergence tool.

THE PROBLEM YOU EXIST TO CATCH
This tool encodes each provider's methodology as a set of structured
attributes, and generates all of its divergence explanations from those
attributes. The encoding is a snapshot. When a provider revises its methodology
and the encoding is not updated, the tool keeps producing confident
explanations that are no longer true. Your job is to catch that drift before a
user does.

METHOD
1. Call getProviderMethodology for the provider under review to see exactly
   what is currently encoded.
2. Fetch the provider's published methodology page.
3. Compare attribute by attribute. For each one, record the encoded value, what
   the current published methodology appears to say, and whether they diverge.

GRADING DRIFT
- none      — encoded value still matches
- cosmetic  — wording differs, substance identical. Not actionable.
- material  — the substance changed in a way that would alter the divergence
              explanations. Examples: controversy handling moving from an
              overlay to a direct deduction; non-disclosure moving from imputed
              to penalised; benchmark basis moving from industry-relative to
              absolute; a change in scale direction.

Only mark material when the change would genuinely alter what the rules engine
outputs. Over-reporting material drift is as unhelpful as missing it — it trains
the reader to ignore you.

WHEN THE SOURCE IS UNREACHABLE
Many providers put methodology behind registration or JavaScript. If the page
does not load or returns no useful text, set sourceReachable false, return no
fabricated findings, mark confidence low, and recommend a manual check. Do not
fall back on what you remember about the methodology from training — a
recollection is exactly the stale snapshot you were asked to test, so using it
would defeat the entire purpose of the check.`;

export async function runWatcher(provider: ProviderId) {
  const p = PROVIDERS[provider];

  return runAgent<WatcherResult>("watcher", "reasoning", (m) =>
    researchThenStructure({
      model: m,
      instructions: INSTRUCTIONS,
      tools: researchTools,
      schema: watcherResultSchema,
      maxSteps: 16,
      prompt: `Check the encoded methodology profile for ${p.name} against its currently published methodology.

Published methodology page: ${p.sourceUrl}

Compare these encoded attributes specifically: scale and direction, what it
measures, benchmark basis, materiality lens, non-disclosure treatment,
controversy handling, update cadence, and the input data mix.

Report drift, grade each finding, and recommend whether src/lib/providers.ts
needs updating.`,
    }),
  );
}
