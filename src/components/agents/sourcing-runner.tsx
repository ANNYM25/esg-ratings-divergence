"use client";

import { useState } from "react";
import type { PipelineResult } from "@/agents/orchestrator";
import { RunButton, TickerPicker, ErrorNote, Stat } from "./controls";

/**
 * Drives the Sourcing → Verifier pipeline and renders both stages side by
 * side, so the audit is as visible as the proposal. Showing only the accepted
 * output would hide the part that makes the design trustworthy.
 */
export function SourcingRunner({
  tickers,
  configured,
}: {
  tickers: Array<{ ticker: string; name: string }>;
  configured: boolean;
}) {
  const [ticker, setTicker] = useState(tickers[0]?.ticker ?? "XOM");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status}).`);
      } else {
        setResult(data as PipelineResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2.5">
        <TickerPicker value={ticker} onChange={setTicker} options={tickers} />
        <RunButton
          onClick={run}
          busy={busy}
          disabled={!configured}
          label="Run pipeline"
          busyLabel="Sourcing then verifying…"
        />
      </div>

      {busy && (
        <p className="mt-3 text-[11.5px] text-subtle">
          Two agents run in sequence and each may fetch several pages. This
          normally takes 30–90 seconds.
        </p>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      {result && !result.ok && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3.5">
          <div className="eyebrow mb-1.5">Provider attempts</div>
          {[...result.fellBackFrom.sourcing, ...result.fellBackFrom.verifier].map(
            (f, i) => (
              <p key={i} className="text-[11px] leading-relaxed text-muted">
                ✗ {f}
              </p>
            ),
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-subtle">
            Free tiers rate-limit on token throughput, and this pipeline is the
            heaviest call in the system. Waiting a minute and retrying usually
            clears it.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Proposed" value={result.counts.proposed} />
            <Stat label="Accepted" value={result.counts.accepted} tone="good" />
            <Stat label="Rejected" value={result.counts.rejected} tone="bad" />
            <Stat label="Uncertain" value={result.counts.uncertain} tone="warn" />
          </div>

          <p className="mt-3 text-[11px] text-subtle">
            Sourcing {(result.timings.sourcingMs / 1000).toFixed(1)}s · Verifying{" "}
            {(result.timings.verifierMs / 1000).toFixed(1)}s
          </p>

          {result.summary.sourcing && (
            <Section title="Sourcing agent">
              <p className="text-[12.5px] leading-relaxed text-muted">
                {result.summary.sourcing}
              </p>
            </Section>
          )}

          {result.blockedSources.length > 0 && (
            <Section title="Blocked sources">
              <ul className="space-y-1.5">
                {result.blockedSources.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-subtle">
                Proprietary rating pages are excluded by design, not by failure.
              </p>
            </Section>
          )}

          {result.verdicts.length > 0 && (
            <Section title="Verifier audit">
              <div className="space-y-2">
                {result.verdicts.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-line bg-surface p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[12.5px] font-bold">
                        {v.provider}
                      </span>
                      <VerdictPill verdict={v.verdict} />
                      {v.correctedScore !== null && (
                        <span className="mono text-[10.5px] text-muted">
                          corrected → {v.correctedScore}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                      {v.reasoning}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(v.checks).map(([k, ok]) => (
                        <span
                          key={k}
                          className="text-[10px]"
                          style={{
                            color: ok ? "var(--div-aligned)" : "var(--div-extreme)",
                          }}
                        >
                          {ok ? "✓" : "✗"} {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.accepted.length > 0 && (
            <Section title="Reviewable patch">
              <p className="mb-2 text-[11.5px] text-muted">
                Figures that survived verification. Nothing is written
                automatically — apply these to{" "}
                <code className="mono rounded bg-surface-2 px-1 py-0.5 text-[11px]">
                  src/data/ratings.ts
                </code>{" "}
                yourself after checking them.
              </p>
              <pre className="scroll-x mono rounded-xl bg-surface-2 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(result.accepted, null, 2)}
              </pre>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-line pt-3.5">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    accept: { bg: "var(--div-aligned-soft)", fg: "var(--div-aligned)" },
    reject: { bg: "var(--div-extreme-soft)", fg: "var(--div-extreme)" },
    uncertain: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  };
  const c = map[verdict] ?? map.uncertain;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {verdict}
    </span>
  );
}
