import { Shell } from "@/components/shell";
import { Card, CardHeader, StatCard } from "@/components/primitives";
import { AgentCard } from "@/components/agents/agent-card";
import { SourcingRunner } from "@/components/agents/sourcing-runner";
import { ControversyRunner } from "@/components/agents/controversy-runner";
import { WatcherRunner } from "@/components/agents/watcher-runner";
import { QaPanel } from "@/components/agents/qa-panel";

import { AGENTS } from "@/agents/registry";
import { availability, PROVIDERS as MODEL_PROVIDERS } from "@/agents/runtime";
import { SOURCE_ALLOWLIST } from "@/agents/tools";
import { SUGGESTED_QUESTIONS } from "@/agents/qa";
import { COMPANIES } from "@/data/companies";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/providers";
import { VALIDATION } from "@/lib/validate";

export const metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default function AgentsPage() {
  const status = availability();
  const tickers = COMPANIES.map((c) => ({ ticker: c.ticker, name: c.name }));
  const providers = PROVIDER_IDS.map((id) => ({
    value: id,
    label: PROVIDERS[id].name,
  }));
  const unverified = VALIDATION.total - VALIDATION.verified;

  return (
    <Shell
      title="Agent layer"
      subtitle="Six agents doing the work code cannot: fetching, classifying, narrating and verifying. The maths stays deterministic."
    >
      {/* ---------- The architectural claim ---------- */}
      <Card>
        <CardHeader
          title="Agents at the edges, deterministic core"
          hint="The one rule that makes this auditable."
        />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[13px] leading-relaxed text-muted">
              Agents <span className="font-semibold text-ink">fetch, classify, narrate and verify</span>{" "}
              — the jobs that need judgement. They never do arithmetic.
              Normalisation, divergence and percentile maths stay in tested
              TypeScript and are handed to the agents{" "}
              <span className="font-semibold text-ink">as tools</span>, so a model
              can <em>call</em> <code className="mono text-[12px]">computeDivergence(&quot;TSLA&quot;)</code>{" "}
              but can never <em>invent</em> the number.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Everything an agent produces is a{" "}
              <span className="font-semibold text-ink">proposal</span>. Nothing is
              written to the dataset without passing the Verifier and, finally, a
              human. That is what keeps the provenance discipline intact once
              models are in the loop.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="mono text-[10.5px] leading-relaxed text-muted">
              <div className="mb-2 font-bold text-ink">AGENTS (probabilistic)</div>
              <div>Sourcing ──┐</div>
              <div>Controversy├──▶ proposals ──▶ human review</div>
              <div>Watcher ───┘</div>
              <div className="my-2 border-t border-line" />
              <div className="mb-2 font-bold text-ink">CORE (deterministic)</div>
              <div>data ▶ normalise ▶ divergence ▶ explain</div>
              <div className="my-2 border-t border-line" />
              <div className="mb-1 font-bold text-ink">EXPOSED AS TOOLS</div>
              <div>Narrative ◀── drivers (read-only)</div>
              <div>Q&amp;A ◀────── all computations</div>
              <div>Verifier ──▶ audits Sourcing</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- Status ---------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          featured
          label="Agents"
          value={AGENTS.length}
          unit="defined"
          delta={status.configured ? "All ready" : "Awaiting credential"}
          hint={`Reasoning: ${status.assignment.reasoning}`}
        />
        <StatCard
          label="Providers live"
          value={MODEL_PROVIDERS.filter((p) => p.available).length}
          unit={`of ${MODEL_PROVIDERS.length}`}
          accent={status.configured ? "var(--div-aligned)" : "var(--warn)"}
          hint={
            status.configured
              ? "Runs fall through the chain when a free tier rate-limits"
              : "Agents are inert until at least one key is configured"
          }
        />
        <StatCard
          label="Records to verify"
          value={unverified}
          unit={`of ${VALIDATION.total}`}
          accent="var(--warn)"
          hint="What the Sourcing and Verifier pair exists to reduce"
        />
        <StatCard
          label="Allowed sources"
          value={SOURCE_ALLOWLIST.length}
          unit="hosts"
          hint="Proprietary rating pages excluded by design"
        />
      </div>

      {!status.configured && (
        <div
          className="mt-5 rounded-2xl border px-4 py-3.5"
          style={{
            background: "var(--warn-soft)",
            borderColor: "var(--warn-border)",
          }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--warn)" }}>
            Agents are defined but not runnable — no model provider key found.
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            {status.setupHint}
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Everything else in the tool keeps working. The Narrative agent falls
            back to the deterministic rules-engine explanation, which is a
            complete answer rather than a placeholder.
          </p>
        </div>
      )}

      {/* ---------- Provider routing ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Model providers"
          hint="Every provider here has a free tier, and every free tier has a rate limit. Runs walk the chain rather than depending on one key staying inside its quota."
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="eyebrow mb-2">Reasoning role</div>
            <p className="text-[12.5px] font-medium">{status.assignment.reasoning}</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              Tool calling, strict structured output and long context. Used by
              Sourcing, Verifier, Controversy, Watcher and Q&amp;A. The Sourcing
              and Verifier pair feed several fetched pages into one context, so
              headroom matters more here than anywhere else.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="eyebrow mb-2">Fast role</div>
            <p className="text-[12.5px] font-medium">{status.assignment.fast}</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              Plain text, no tools, closed prompt. Only the Narrative agent, whose
              requirement is the weakest in the system — so it gets the quickest
              model rather than the strongest, and the streamed note appears
              almost immediately.
            </p>
          </div>
        </div>

        <div className="mt-4 scroll-x">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-2 pr-3 text-left"><span className="eyebrow">Provider</span></th>
                <th className="pb-2 pr-3 text-left"><span className="eyebrow">Status</span></th>
                <th className="pb-2 pr-3 text-left"><span className="eyebrow">Env var</span></th>
                <th className="pb-2 pr-3 text-left"><span className="eyebrow">Free tier</span></th>
                <th className="pb-2 text-left"><span className="eyebrow">Role here</span></th>
              </tr>
            </thead>
            <tbody>
              {MODEL_PROVIDERS.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-semibold">{p.label}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                      style={{
                        background: p.available
                          ? "var(--div-aligned-soft)"
                          : "var(--surface-3)",
                        color: p.available
                          ? "var(--div-aligned)"
                          : "var(--text-subtle)",
                      }}
                    >
                      {p.available ? "live" : "no key"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <code className="mono text-[11px] text-muted">{p.envVar}</code>
                  </td>
                  <td className="py-2.5 pr-3 text-muted">{p.freeTier}</td>
                  <td className="py-2.5 text-muted">{p.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-subtle">
          xAI&rsquo;s Grok is deliberately absent: it requires a card, has no
          dependable free tier, and covers nothing the providers above do not.
          Ollama sits last because a laptop-sized model is not reliable enough for
          multi-step tool chains or strict JSON schemas — useful for offline
          narrative work, not for the sourcing agents.
        </p>
      </Card>

      {/* ---------- Pipeline ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Agents 1 + 2 — Sourcing → Verifier pipeline"
          hint="The one place two agents genuinely depend on each other. Sourcing proposes a figure with a citation; the Verifier independently re-fetches that citation and tries to knock it down."
        />
        <SourcingRunner tickers={tickers} configured={status.configured} />
      </Card>

      {/* ---------- Controversy + Watcher ---------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Agent 3 — Controversy Analyst"
            hint="Re-grades the controversy level that drives one of the strongest divergence rules, and says what it means for the ratings."
          />
          <ControversyRunner tickers={tickers} configured={status.configured} />
        </Card>

        <Card>
          <CardHeader
            title="Agent 5 — Methodology Watcher"
            hint="Compares each provider's published methodology against what this tool has encoded, and grades any drift."
          />
          <WatcherRunner providers={providers} configured={status.configured} />
        </Card>
      </div>

      {/* ---------- Q&A ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Agent 6 — Ask the data"
          hint="Answers by calling the deterministic engine, never by recalling figures. The tool trace under each answer shows which computation produced each number."
        />
        <QaPanel suggestions={SUGGESTED_QUESTIONS} configured={status.configured} />
      </Card>

      {/* ---------- Roster ---------- */}
      <div className="mt-5">
        <h2 className="mb-3 font-display text-[17px] font-bold tracking-tight">
          The roster
        </h2>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((spec) => (
            <AgentCard key={spec.id} spec={spec} configured={status.configured}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-subtle">Appears in</span>
                <span className="font-medium">{spec.surface}</span>
              </div>
            </AgentCard>
          ))}
        </div>
      </div>

      {/* ---------- Source policy ---------- */}
      <Card className="mt-5">
        <CardHeader
          title="Source policy"
          hint="Why the Sourcing agent is deliberately restricted."
        />
        <p className="text-[13px] leading-relaxed text-muted">
          An agent pointed at the open web will happily scrape MSCI&rsquo;s
          rating-lookup page. That is the same terms-of-service violation as
          doing it by hand, only faster and more traceable. The{" "}
          <code className="mono text-[12px]">fetchPage</code> tool is therefore
          allowlisted to genuinely open sources, and the agent is instructed to
          report proprietary providers as{" "}
          <span className="font-semibold text-ink">blocked</span> rather than
          route around them.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SOURCE_ALLOWLIST.map((d) => (
            <span
              key={d}
              className="mono rounded-md bg-surface-2 px-2 py-1 text-[10.5px] text-muted"
            >
              {d}
            </span>
          ))}
          <span className="mono rounded-md bg-surface-2 px-2 py-1 text-[10.5px] text-muted">
            + company-owned domains
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-subtle">
          The practical consequence: S&amp;P Global CSA and CDP scores can be
          sourced automatically. MSCI, Sustainalytics and LSEG require a licensed
          terminal or manual lookup, and the pipeline will tell you so instead of
          quietly returning nothing.
        </p>
      </Card>
    </Shell>
  );
}
