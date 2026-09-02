/**
 * Model provider resolution.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WHY MULTIPLE PROVIDERS
 *
 * Every provider used here has a genuinely free tier, and every free tier has
 * a rate limit you will hit. A single-provider setup means the agent layer
 * simply stops working mid-demo. So models are resolved as an ORDERED CHAIN
 * per role, and `runAgent` walks down it when a call fails.
 *
 * This mirrors the Cerebras → Groq → Gemini fallback already used in the
 * DEALIGENT project, for consistency across the two codebases.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ROLES — the agents do not all need the same capability.
 *
 *   reasoning — tool calling + strict structured output + long context.
 *               Agents 1, 2, 3, 5 and 6 depend on all three. The Sourcing and
 *               Verifier agents in particular feed several fetched pages
 *               (~12k characters each) into one context, so headroom matters.
 *
 *   fast      — plain text, no tools, closed prompt. Only the Narrative agent
 *               (4), which by design has no tools and may only rephrase what
 *               it is handed. That is the weakest requirement in the system,
 *               so it gets the fastest model rather than the strongest.
 *
 * WHY THIS ORDER
 *
 * ORDER — set from measured behaviour, not from spec sheets.
 *
 *   Groq leads. On live testing it answered first time while Gemini's free tier
 *   returned 503 "high demand" through three retries. Its 128k context sounds
 *   modest next to Gemini's 1M, but fetchPage caps each page at 12k characters,
 *   so even the Sourcing agent reading five pages stays well inside it. The
 *   larger window was a theoretical advantage; the reliability is a real one.
 *
 *   Gemini follows, and is worth keeping: when it is not under load it is
 *   strong at structured output, and its context headroom is genuine insurance
 *   if the fetch limits are ever raised.
 *
 *   Cerebras sits third. It is the fastest of the three, but its free daily
 *   allowance runs out and then returns "payment required", which makes it a
 *   poor thing to depend on.
 *
 *   Cerebras gpt-oss-120b leads for fast: ~1M tokens/day free and very high
 *   throughput, which makes the streamed analyst note feel instant.
 *
 * NOT INCLUDED: xAI's Grok. It requires a card and has no dependable free
 * tier, and it offers nothing the three above do not already cover.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createCerebras } from "@ai-sdk/cerebras";
import { createOllama } from "ollama-ai-provider-v2";
import { gateway } from "ai";
import type { LanguageModel } from "ai";

export type ModelRole = "reasoning" | "fast";

export type ProviderId =
  | "google"
  | "cerebras"
  | "groq"
  | "ollama"
  | "gateway";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  envVar: string;
  signupUrl: string;
  freeTier: string;
  /** What this provider is best used for here. */
  bestFor: string;
  available: boolean;
  models: Record<ModelRole, string>;
}

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

/* ------------------------------------------------------------------ *
 * Provider catalogue
 * ------------------------------------------------------------------ */

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "google",
    label: "Google Gemini",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    signupUrl: "https://aistudio.google.com/apikey",
    freeTier: "Free tier, no card required",
    bestFor:
      "Second in the reasoning chain. Strong structured output and a 1M-token context, but the free tier returns 503 under load often enough that it is not dependable as primary.",
    available: Boolean(env("GOOGLE_GENERATIVE_AI_API_KEY") ?? env("GEMINI_API_KEY")),
    // Floating aliases, not pinned versions. Pinning broke once already:
    // gemini-2.5-flash was retired for new keys and started returning 404. The
    // alias tracks the current Flash generation, which is the right trade for a
    // tool nobody will be re-pinning every quarter.
    models: { reasoning: "gemini-flash-latest", fast: "gemini-flash-lite-latest" },
  },
  {
    id: "cerebras",
    label: "Cerebras",
    envVar: "CEREBRAS_API_KEY",
    signupUrl: "https://cloud.cerebras.ai",
    freeTier: "Free daily allowance, then billing required",
    bestFor:
      "Extremely fast, which suits the Narrative agent's streamed note. Returns 'payment required' once the daily free allowance is spent, so it sits behind Groq.",
    available: Boolean(env("CEREBRAS_API_KEY")),
    models: { reasoning: "gpt-oss-120b", fast: "gpt-oss-120b" },
  },
  {
    id: "groq",
    label: "Groq",
    envVar: "GROQ_API_KEY",
    signupUrl: "https://console.groq.com",
    freeTier: "Free tier with per-minute limits",
    bestFor:
      "Rate-limit insurance, and in practice the most dependable of the three. Very fast, with solid tool calling on gpt-oss-120b.",
    available: Boolean(env("GROQ_API_KEY")),
    // Verified against api.groq.com/openai/v1/models. The Llama 3.x models that
    // the SDK's bundled type union still lists have been withdrawn — another
    // reason the chain matters more than any single pinned model.
    models: { reasoning: "openai/gpt-oss-120b", fast: "openai/gpt-oss-20b" },
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    envVar: "OLLAMA_MODEL",
    signupUrl: "https://ollama.com",
    freeTier: "Free forever — runs on your own machine",
    bestFor:
      "Offline development and zero-cost narrative generation. Deliberately last: a laptop-sized model is not reliable enough for multi-step tool chains or strict JSON schemas.",
    available: Boolean(env("OLLAMA_MODEL")),
    models: {
      reasoning: env("OLLAMA_MODEL") ?? "llama3.1:8b",
      fast: env("OLLAMA_MODEL") ?? "llama3.1:8b",
    },
  },
  {
    id: "gateway",
    label: "Vercel AI Gateway",
    envVar: "AI_GATEWAY_API_KEY",
    signupUrl: "https://vercel.com/docs/ai-gateway",
    freeTier: "Paid, with starting credit",
    bestFor:
      "Optional. Routes to frontier models (Claude, GPT) through one key. Used first when present, since it is the strongest option available.",
    available: Boolean(env("AI_GATEWAY_API_KEY") ?? env("VERCEL_OIDC_TOKEN")),
    models: {
      reasoning: "anthropic/claude-sonnet-5",
      fast: "anthropic/claude-haiku-4.5",
    },
  },
];

/* ------------------------------------------------------------------ *
 * Chains
 * ------------------------------------------------------------------ */

/**
 * Preference order per role. The gateway leads when configured because it
 * reaches frontier models; otherwise the free providers take over in the order
 * that suits each role.
 */
const CHAINS: Record<ModelRole, ProviderId[]> = {
  reasoning: ["gateway", "groq", "google", "cerebras", "ollama"],
  fast: ["gateway", "groq", "cerebras", "google", "ollama"],
};

function info(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!;
}

function instantiate(id: ProviderId, modelId: string): LanguageModel {
  switch (id) {
    case "google": {
      const google = createGoogleGenerativeAI({
        // Accept either the SDK's conventional name or the shorter one used in
        // the DEALIGENT project, so a single key works across both.
        apiKey: env("GOOGLE_GENERATIVE_AI_API_KEY") ?? env("GEMINI_API_KEY"),
      });
      return google(modelId);
    }
    case "groq":
      return createGroq({ apiKey: env("GROQ_API_KEY") })(modelId);
    case "cerebras":
      return createCerebras({ apiKey: env("CEREBRAS_API_KEY") })(modelId);
    case "ollama":
      return createOllama({
        baseURL: env("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434/api",
      })(modelId);
    case "gateway":
      return gateway(modelId);
  }
}

export interface ResolvedModel {
  provider: ProviderId;
  providerLabel: string;
  modelId: string;
  model: LanguageModel;
}

/**
 * The full ordered chain of usable models for a role. Empty when nothing is
 * configured — callers report that as "unavailable" rather than throwing.
 */
export function resolveChain(role: ModelRole): ResolvedModel[] {
  return CHAINS[role]
    .map(info)
    .filter((p) => p.available)
    .map((p) => ({
      provider: p.id,
      providerLabel: p.label,
      modelId: p.models[role],
      model: instantiate(p.id, p.models[role]),
    }));
}

export function isConfigured(): boolean {
  return PROVIDERS.some((p) => p.available);
}

export function configuredProviders(): ProviderInfo[] {
  return PROVIDERS.filter((p) => p.available);
}

/** Human-readable description of what will actually be used, for the UI. */
export function activeAssignment(): Record<ModelRole, string> {
  const pick = (role: ModelRole) => {
    const chain = resolveChain(role);
    if (chain.length === 0) return "none configured";
    const [first, ...rest] = chain;
    const fallbacks = rest.map((r) => r.providerLabel).join(" → ");
    return `${first.providerLabel} ${first.modelId}${fallbacks ? ` (falls back to ${fallbacks})` : ""}`;
  };
  return { reasoning: pick("reasoning"), fast: pick("fast") };
}
