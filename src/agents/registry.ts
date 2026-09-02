/**
 * Agent registry — the roster the /agents page renders from.
 *
 * Kept as plain data (no model imports) so it can be used in client components
 * and metadata without pulling the AI SDK into the browser bundle.
 */

export type AgentKind = "pipeline" | "analysis" | "narrative" | "chat" | "monitor";

export interface AgentSpec {
  id: string;
  number: number;
  name: string;
  role: string;
  /** What it does that code cannot. This is the justification for it existing. */
  why: string;
  kind: AgentKind;
  model: "reasoning" | "fast";
  tools: string[];
  /** Constraint that keeps it inside the architecture. */
  guardrail: string;
  /** Where it appears in the UI. */
  surface: string;
  accent: string;
}

export const AGENTS: AgentSpec[] = [
  {
    id: "sourcing",
    number: 1,
    name: "Data Sourcing",
    role: "Finds and transcribes published ratings from open sources",
    why: "Attacks the tool's biggest weakness — 120 unverified placeholder ratings. Reading a provider's published page, locating the figure and recording its citation is judgement work that no amount of code can do.",
    kind: "pipeline",
    model: "reasoning",
    tools: ["fetchPage", "getCompanyProfile", "getProviderMethodology"],
    guardrail:
      "Restricted to an allowlist of genuinely open sources. Proprietary rating-lookup pages are blocked by design, and the agent must report them as blocked rather than route around them. It proposes; it never writes to the dataset.",
    surface: "/agents — Sourcing pipeline",
    accent: "var(--provider-msci)",
  },
  {
    id: "verifier",
    number: 2,
    name: "Verifier / Critic",
    role: "Independently audits every proposal against its own citation",
    why: "This is what separates a real pipeline from 'an LLM found a number on the internet'. A second model, which did not produce the proposal and is rewarded for rejecting, re-fetches each source and checks the figure is actually there.",
    kind: "pipeline",
    model: "reasoning",
    tools: ["fetchPage", "getProviderMethodology"],
    guardrail:
      "Sceptical by default. Accepts only when it personally confirms the figure in the cited source. Explicitly checks that Sustainalytics' lower-is-better direction was not misread.",
    surface: "/agents — Sourcing pipeline",
    accent: "var(--div-significant)",
  },
  {
    id: "controversy",
    number: 3,
    name: "Controversy Analyst",
    role: "Re-assesses controversy level and its ratings consequence",
    why: "The controversy attribute drives one of the strongest divergence rules, and it is hand-set and goes stale. Grading severity from messy real-world events is exactly the judgement call code cannot make.",
    kind: "analysis",
    model: "reasoning",
    tools: ["fetchPage", "getCompanyProfile", "getDivergenceReasons"],
    guardrail:
      "Reports whether its assessment differs from what is encoded, rather than silently overwriting. Proposes only — never edits src/data/companies.ts.",
    surface: "Company page — Controversy panel",
    accent: "var(--div-extreme)",
  },
  {
    id: "narrative",
    number: 4,
    name: "Narrative Analyst",
    role: "Turns deterministic drivers into analyst prose",
    why: "The rules engine produces correct explanations that read like a specification. Writing them as prose an investment professional would actually read is a language task, which is the one thing a model is straightforwardly better at.",
    kind: "narrative",
    model: "reasoning",
    tools: [],
    guardrail:
      "Has NO tools at all. Every figure it may mention is injected from the deterministic engine. It may rephrase the supplied drivers and nothing else. Falls back to the rules-engine summary when unavailable.",
    surface: "Company page — Why they disagree",
    accent: "var(--provider-lseg)",
  },
  {
    id: "watcher",
    number: 5,
    name: "Methodology Watcher",
    role: "Detects drift between encoded and published methodologies",
    why: "Provider methodologies change. When they do, every explanation this tool produces quietly becomes wrong while still looking authoritative. Reading a methodology document and judging whether a change is substantive is not pattern matching.",
    kind: "monitor",
    model: "reasoning",
    tools: ["fetchPage", "getProviderMethodology"],
    guardrail:
      "Grades drift as cosmetic or material, where material means it would change the rules engine's output. Forbidden from falling back on remembered methodology — that stale snapshot is precisely what it is testing.",
    surface: "/agents — Methodology drift",
    accent: "var(--provider-spcsa)",
  },
  {
    id: "qa",
    number: 6,
    name: "Research Q&A",
    role: "Answers natural-language questions by calling the engine",
    why: "Turns a fixed dashboard into something you can interrogate. Mapping a vague question onto the right computation, then chaining several, is the reasoning step between a user and a set of functions.",
    kind: "chat",
    model: "reasoning",
    tools: [
      "listCompanies",
      "getRatings",
      "getDivergence",
      "getDivergenceReasons",
      "getUniverseStats",
      "rankCompanies",
      "getProviderMethodology",
      "getCompanyProfile",
    ],
    guardrail:
      "Must call a tool before stating any figure. The UI surfaces every tool call beside the answer, so each number is traceable to the computation that produced it.",
    surface: "/agents — Ask the data",
    accent: "var(--provider-sustainalytics)",
  },
];

export function getAgent(id: string): AgentSpec | undefined {
  return AGENTS.find((a) => a.id === id);
}
