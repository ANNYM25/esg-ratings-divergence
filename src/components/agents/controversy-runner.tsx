"use client";

import { useState } from "react";
import type { ControversyResult } from "@/agents/schemas";
import type { AgentRun } from "@/agents/runtime";
import { RunButton, TickerPicker, ErrorNote, ConfidencePill } from "./controls";

const LEVEL_COLOR: Record<string, string> = {
  none: "var(--div-aligned)",
  moderate: "var(--div-mild)",
  significant: "var(--div-significant)",
  severe: "var(--div-extreme)",
};

export function ControversyRunner({
  tickers,
  configured,
}: {
  tickers: Array<{ ticker: string; name: string }>;
  configured: boolean;
}) {
  const [ticker, setTicker] = useState("BA");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ControversyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents/controversy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const run = (await res.json()) as AgentRun<ControversyResult>;
      if (!run.ok) setError(run.error ?? "Agent failed.");
      else setResult(run.data ?? null);
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
          label="Assess"
          busyLabel="Assessing…"
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {result && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <LevelChip label="Encoded" level={result.encodedLevel} muted />
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-subtle" fill="none" aria-hidden>
              <path d="M5 12h13m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <LevelChip label="Assessed" level={result.currentLevel} />
            {result.changed ? (
              <span
                className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
              >
                Change proposed
              </span>
            ) : (
              <span className="text-[11px] text-subtle">Encoded level confirmed</span>
            )}
            <ConfidencePill level={result.confidence} />
          </div>

          <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted">
            {result.rationale}
          </p>

          <div
            className="mt-3 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed"
            style={{ background: "var(--surface-2)" }}
          >
            <span className="font-semibold text-ink">Effect on divergence. </span>
            <span className="text-muted">{result.divergenceImpact}</span>
          </div>

          {result.events.length > 0 && (
            <div className="mt-4 border-t border-line pt-3.5">
              <div className="eyebrow mb-2">Evidence timeline</div>
              <div className="space-y-2">
                {result.events.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mono w-16 shrink-0 pt-0.5 text-[10.5px] text-subtle">
                      {e.date}
                    </span>
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: LEVEL_COLOR[e.severity] ?? "var(--text-subtle)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium">{e.headline}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-subtle">
                        <span className="capitalize">{e.category}</span>
                        <span>·</span>
                        <span className="capitalize">{e.severity}</span>
                        {e.ongoing && (
                          <>
                            <span>·</span>
                            <span style={{ color: "var(--warn)" }}>ongoing</span>
                          </>
                        )}
                        {e.sourceUrl && (
                          <>
                            <span>·</span>
                            <a
                              href={e.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-brand"
                            >
                              source
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-[11px] leading-relaxed text-subtle">
            This is a proposal. It does not modify{" "}
            <code className="mono">src/data/companies.ts</code> — changing an
            encoded controversy level stays a human decision.
          </p>
        </div>
      )}
    </div>
  );
}

function LevelChip({
  label,
  level,
  muted,
}: {
  label: string;
  level: string;
  muted?: boolean;
}) {
  const color = LEVEL_COLOR[level] ?? "var(--text-subtle)";
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-subtle">{label}</span>
      <span
        className="rounded-full px-2.5 py-1 text-[11.5px] font-bold capitalize"
        style={{
          background: muted
            ? "var(--surface-3)"
            : `color-mix(in oklab, ${color} 15%, transparent)`,
          color: muted ? "var(--text-muted)" : color,
        }}
      >
        {level}
      </span>
    </span>
  );
}
