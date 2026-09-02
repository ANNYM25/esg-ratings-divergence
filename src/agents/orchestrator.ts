/**
 * Orchestration.
 *
 * The Sourcing → Verifier pipeline is the one place where two agents genuinely
 * depend on each other rather than merely coexisting. Sourcing proposes,
 * Verifier independently audits, and the pipeline reports only what survived.
 *
 * Note what the pipeline does NOT do: it does not write anything. Accepted
 * proposals are returned as a patch a human can review and apply to
 * src/data/ratings.ts. An agent pipeline that silently mutated the dataset
 * would undo the entire provenance discipline the tool is built on.
 */

import { runSourcing } from "./sourcing";
import { runVerifier } from "./verifier";
import { isConfigured, availability } from "./runtime";
import type { RatingProposal, Verdict } from "./schemas";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

export interface PipelineResult {
  ticker: string;
  ok: boolean;
  unavailable?: boolean;
  error?: string;
  /** What the Sourcing agent proposed. */
  proposals: RatingProposal[];
  /** What the Verifier concluded about each. */
  verdicts: Verdict[];
  /** Proposals that survived verification, as a ready-to-review patch. */
  accepted: Array<{
    ticker: string;
    provider: ProviderId;
    providerName: string;
    rawScore: number;
    asOf: string | null;
    sourceUrl: string | null;
    quote: string | null;
  }>;
  counts: { proposed: number; accepted: number; rejected: number; uncertain: number };
  blockedSources: string[];
  timings: { sourcingMs: number; verifierMs: number; totalMs: number };
  summary: { sourcing: string; verification: string };
  /** Providers that failed at each stage. Surfaced so free-tier limits are diagnosable. */
  fellBackFrom: { sourcing: string[]; verifier: string[] };
}

/**
 * Pause between the two stages.
 *
 * The Sourcing agent is the heaviest call in the system — a 24-step tool loop
 * pulling several 12k-character pages into context. On a free tier that is
 * enough to consume the whole per-minute token allowance, so firing the
 * Verifier immediately afterwards fails on rate limit even though both agents
 * work perfectly in isolation.
 *
 * Waiting for the window to roll is unglamorous but correct: the alternative is
 * a pipeline that only succeeds on a paid key.
 */
const INTER_STAGE_COOLDOWN_MS = 20_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSourcingPipeline(ticker: string): Promise<PipelineResult> {
  const t = ticker.toUpperCase();
  const started = Date.now();

  const empty: PipelineResult = {
    ticker: t,
    ok: false,
    proposals: [],
    verdicts: [],
    accepted: [],
    counts: { proposed: 0, accepted: 0, rejected: 0, uncertain: 0 },
    blockedSources: [],
    timings: { sourcingMs: 0, verifierMs: 0, totalMs: 0 },
    summary: { sourcing: "", verification: "" },
    fellBackFrom: { sourcing: [], verifier: [] },
  };

  if (!isConfigured()) {
    return { ...empty, unavailable: true, error: availability().reason ?? undefined };
  }

  // ── Stage 1: propose ──────────────────────────────────────────────
  const sourcing = await runSourcing(t);
  if (!sourcing.ok || !sourcing.data) {
    return {
      ...empty,
      error: sourcing.error ?? "Sourcing agent failed.",
      timings: { sourcingMs: sourcing.ms, verifierMs: 0, totalMs: Date.now() - started },
      fellBackFrom: { sourcing: sourcing.fellBackFrom ?? [], verifier: [] },
    };
  }

  const proposals = sourcing.data.proposals;

  // ── Stage 2: audit ────────────────────────────────────────────────
  // Let the free-tier token window roll before the second heavy call.
  await wait(INTER_STAGE_COOLDOWN_MS);

  const verification = await runVerifier(proposals);
  if (!verification.ok || !verification.data) {
    return {
      ...empty,
      proposals,
      blockedSources: sourcing.data.blockedSources,
      error: verification.error ?? "Verifier failed.",
      summary: { sourcing: sourcing.data.summary, verification: "" },
      timings: {
        sourcingMs: sourcing.ms,
        verifierMs: verification.ms,
        totalMs: Date.now() - started,
      },
      fellBackFrom: {
        sourcing: sourcing.fellBackFrom ?? [],
        verifier: verification.fellBackFrom ?? [],
      },
    };
  }

  const verdicts = verification.data.verdicts;

  // ── Stage 3: keep only what survived ──────────────────────────────
  const accepted = proposals
    .filter((p) => {
      const v = verdicts.find(
        (x) =>
          x.ticker.toUpperCase() === p.ticker.toUpperCase() &&
          x.provider.toLowerCase().includes(p.provider.slice(0, 4).toLowerCase()),
      );
      return v?.verdict === "accept" && p.found && p.score !== null;
    })
    .map((p) => {
      const v = verdicts.find(
        (x) =>
          x.ticker.toUpperCase() === p.ticker.toUpperCase() &&
          x.provider.toLowerCase().includes(p.provider.slice(0, 4).toLowerCase()),
      );
      return {
        ticker: p.ticker.toUpperCase(),
        provider: p.provider,
        providerName: PROVIDERS[p.provider].shortName,
        // The Verifier's correction wins over the Sourcing agent's reading.
        rawScore: v?.correctedScore ?? (p.score as number),
        asOf: p.asOf,
        sourceUrl: p.sourceUrl,
        quote: p.quote,
      };
    });

  return {
    ticker: t,
    ok: true,
    proposals,
    verdicts,
    accepted,
    counts: {
      proposed: proposals.length,
      accepted: verification.data.accepted,
      rejected: verification.data.rejected,
      uncertain: verification.data.uncertain,
    },
    blockedSources: sourcing.data.blockedSources,
    timings: {
      sourcingMs: sourcing.ms,
      verifierMs: verification.ms,
      totalMs: Date.now() - started,
    },
    summary: {
      sourcing: sourcing.data.summary,
      verification: verification.data.summary,
    },
    fellBackFrom: {
      sourcing: sourcing.fellBackFrom ?? [],
      verifier: verification.fellBackFrom ?? [],
    },
  };
}
