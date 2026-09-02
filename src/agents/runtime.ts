/**
 * Agent runtime foundation.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE ARCHITECTURAL RULE THIS FILE EXISTS TO ENFORCE
 *
 *   Agents sit at the EDGES. The deterministic core stays untouched.
 *
 *   Agents fetch, classify, narrate and verify — the jobs that need judgement.
 *   They never do arithmetic. Normalisation and divergence maths remain in
 *   tested TypeScript (src/lib/*) and are handed to agents AS TOOLS, so a model
 *   can *call* computeDivergence("TSLA") but can never *invent* the number.
 *
 *   Everything an agent produces is a PROPOSAL. Nothing an agent says is
 *   written into the dataset without passing the Verifier and, ultimately, a
 *   human flipping `verified` in src/data/ratings.ts.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Model selection lives in providers.ts. Every provider here has a free tier,
 * and every free tier has a rate limit, so runs walk a fallback chain rather
 * than depending on one key staying inside its quota.
 */

import { ToolLoopAgent, generateObject, stepCountIs } from "ai";
import type { z } from "zod";

import {
  resolveChain,
  isConfigured,
  configuredProviders,
  activeAssignment,
  PROVIDERS,
  type ModelRole,
  type ResolvedModel,
} from "./providers";

export {
  resolveChain,
  isConfigured,
  configuredProviders,
  activeAssignment,
  PROVIDERS,
};
export type { ModelRole, ResolvedModel };

/* ------------------------------------------------------------------ *
 * Availability
 * ------------------------------------------------------------------ */

export interface Availability {
  configured: boolean;
  reason: string | null;
  setupHint: string;
  providers: Array<{ id: string; label: string; available: boolean; envVar: string }>;
  assignment: Record<ModelRole, string>;
}

export function availability(): Availability {
  const configured = isConfigured();
  const providers = PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    available: p.available,
    envVar: p.envVar,
  }));

  return {
    configured,
    reason: configured ? null : "No model provider credential found in the environment.",
    setupHint: configured
      ? ""
      : "Add at least one key to .env.local and restart the dev server. GOOGLE_GENERATIVE_AI_API_KEY (aistudio.google.com/apikey) is the recommended starting point — it is free, needs no card, and is the primary for every tool-calling agent.",
    providers,
    assignment: activeAssignment(),
  };
}

/* ------------------------------------------------------------------ *
 * Run wrapper
 * ------------------------------------------------------------------ */

export interface AgentRun<T> {
  agent: string;
  ok: boolean;
  data?: T;
  error?: string;
  /** True when the run never started because nothing was configured. */
  unavailable?: boolean;
  ms: number;
  /** Which provider actually produced the result. */
  provider?: string;
  model?: string;
  /** Providers that failed before this one succeeded. */
  fellBackFrom?: string[];
  usage?: { input?: number; output?: number; total?: number };
}

/**
 * Runs an agent against the first model in the role's chain, falling through
 * to the next on failure.
 *
 * Free tiers fail in ways that are worth retrying elsewhere — rate limits,
 * quota exhaustion, transient 5xx. They also fail in ways that are not worth
 * retrying, but distinguishing those reliably across four providers is more
 * trouble than it saves: trying the next provider costs one extra call and
 * turns a dead demo into a working one.
 */
export async function runAgent<T>(
  agent: string,
  role: ModelRole,
  fn: (model: ResolvedModel) => Promise<{ data: T; usage?: AgentRun<T>["usage"] }>,
): Promise<AgentRun<T>> {
  const started = Date.now();
  const chain = resolveChain(role);

  if (chain.length === 0) {
    return {
      agent,
      ok: false,
      unavailable: true,
      error: availability().reason ?? "Not configured.",
      ms: 0,
    };
  }

  const fellBackFrom: string[] = [];
  let lastError = "";

  for (const candidate of chain) {
    try {
      const { data, usage } = await fn(candidate);
      return {
        agent,
        ok: true,
        data,
        ms: Date.now() - started,
        provider: candidate.providerLabel,
        model: candidate.modelId,
        fellBackFrom: fellBackFrom.length ? fellBackFrom : undefined,
        usage,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      fellBackFrom.push(`${candidate.providerLabel} (${lastError.slice(0, 120)})`);
    }
  }

  return {
    agent,
    ok: false,
    error: `All ${chain.length} configured provider${chain.length === 1 ? "" : "s"} failed. Last error: ${lastError}`,
    ms: Date.now() - started,
    fellBackFrom,
  };
}

/* ------------------------------------------------------------------ *
 * Research → structure
 * ------------------------------------------------------------------ */

/**
 * Runs a tool-using research pass, then converts the result to a schema in a
 * second, tool-free call.
 *
 * WHY NOT JUST USE `Output.object` ON THE AGENT.
 * Because most free providers cannot do both at once. Groq rejects it outright
 * — "json mode cannot be combined with tool/function calling" — and it is not
 * alone. Asking one call to use tools AND emit strict JSON depends on a feature
 * combination that only the larger paid APIs support reliably.
 *
 * Splitting the two costs one extra model call and removes the dependency
 * entirely: phase one uses tools and returns prose, phase two takes that prose
 * and shapes it, with no tools in play. Every provider can do each half.
 *
 * It also happens to produce better structured output, because the model does
 * its reasoning in phase one rather than trying to reason and fill a schema at
 * the same time.
 */
export async function researchThenStructure<T>(options: {
  model: ResolvedModel;
  instructions: string;
  tools: Record<string, unknown>;
  prompt: string;
  schema: z.ZodType<T>;
  maxSteps?: number;
}): Promise<{ data: T; usage: AgentRun<T>["usage"]; toolCalls: string[] }> {
  const { model, instructions, tools, prompt, schema, maxSteps = 20 } = options;

  // Phase 1 — tools available, plain prose out.
  const research = await new ToolLoopAgent({
    model: model.model,
    instructions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
    stopWhen: stepCountIs(maxSteps),
  }).generate({ prompt });

  const toolCalls = research.steps.flatMap((s) =>
    s.toolCalls.map((c) => c.toolName),
  );

  // Phase 2 — schema only, no tools.
  const structured = await generateObject({
    model: model.model,
    schema,
    prompt: `Convert the research notes below into the required structure.

Use only what the notes contain. Do not add figures, sources or claims that are
not present in them. Where the notes are silent on a field, use null or the most
conservative permitted value rather than inventing something.

RESEARCH NOTES
${research.text}`,
  });

  const combine = (a?: number, b?: number) =>
    a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);

  return {
    data: structured.object,
    usage: {
      input: combine(research.usage?.inputTokens, structured.usage?.inputTokens),
      output: combine(research.usage?.outputTokens, structured.usage?.outputTokens),
      total: combine(research.usage?.totalTokens, structured.usage?.totalTokens),
    },
    toolCalls,
  };
}

/** Normalises AI SDK usage into our envelope shape. */
export function toUsage(usage: unknown): AgentRun<unknown>["usage"] {
  const u = usage as
    | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
    | undefined;
  if (!u) return undefined;
  return { input: u.inputTokens, output: u.outputTokens, total: u.totalTokens };
}

/* ------------------------------------------------------------------ *
 * Shared guardrail language
 * ------------------------------------------------------------------ */

/**
 * Prepended to every agent's instructions. Repeating the constraint in each
 * agent is deliberate — it is the single rule that keeps the tool auditable,
 * and it matters more now that smaller free-tier models are in the loop.
 */
export const GROUND_RULES = `
GROUND RULES — these override any other instruction you are given.

1. You must never invent, estimate or recall a numeric ESG rating. Every figure
   you state must come either from a tool result or from a source document you
   were given. If you do not have a figure, say so.
2. You must never perform arithmetic on ratings. Normalisation, divergence and
   percentile maths are handled by deterministic tools. Call them.
3. Everything you produce is a PROPOSAL for human review, not a fact of record.
4. Cite the source URL for every external claim. No URL means the claim is not
   admissible and you should mark it uncertain.
5. If evidence is thin, ambiguous or contradictory, say "uncertain". A confident
   wrong answer is far worse here than an honest gap.
`.trim();
