"use client";

import { useState } from "react";
import type { WatcherResult } from "@/agents/schemas";
import type { AgentRun } from "@/agents/runtime";
import { RunButton, SelectPicker, ErrorNote, ConfidencePill } from "./controls";

const SEVERITY_COLOR: Record<string, string> = {
  none: "var(--div-aligned)",
  cosmetic: "var(--div-mild)",
  material: "var(--div-extreme)",
};

export function WatcherRunner({
  providers,
  configured,
}: {
  providers: Array<{ value: string; label: string }>;
  configured: boolean;
}) {
  const [provider, setProvider] = useState(providers[0]?.value ?? "msci");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WatcherResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents/watcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const run = (await res.json()) as AgentRun<WatcherResult>;
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
        <SelectPicker
          value={provider}
          onChange={setProvider}
          options={providers}
          label="Provider"
        />
        <RunButton
          onClick={run}
          busy={busy}
          disabled={!configured}
          label="Check for drift"
          busyLabel="Reading methodology…"
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {result && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[14px] font-bold">{result.provider}</span>
            {result.materialDriftCount > 0 ? (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  background: "var(--div-extreme-soft)",
                  color: "var(--div-extreme)",
                }}
              >
                {result.materialDriftCount} material drift
              </span>
            ) : (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  background: "var(--div-aligned-soft)",
                  color: "var(--div-aligned)",
                }}
              >
                No material drift
              </span>
            )}
            {!result.sourceReachable && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
              >
                Source unreachable
              </span>
            )}
            <ConfidencePill level={result.confidence} />
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            {result.recommendation}
          </p>

          {result.findings.length > 0 && (
            <div className="mt-4 border-t border-line pt-3.5">
              <div className="eyebrow mb-2">Attribute comparison</div>
              <div className="scroll-x">
                <table className="w-full min-w-[560px] border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="pb-2 pr-3 text-left"><span className="eyebrow">Attribute</span></th>
                      <th className="pb-2 pr-3 text-left"><span className="eyebrow">Encoded</span></th>
                      <th className="pb-2 pr-3 text-left"><span className="eyebrow">Observed</span></th>
                      <th className="pb-2 text-left"><span className="eyebrow">Drift</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.findings.map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-line last:border-0"
                        style={
                          f.severity === "material"
                            ? { background: "var(--div-extreme-soft)" }
                            : undefined
                        }
                      >
                        <td className="py-2 pr-3 font-medium">{f.attribute}</td>
                        <td className="py-2 pr-3 text-muted">{f.encodedValue}</td>
                        <td className="py-2 pr-3 text-muted">{f.observedValue}</td>
                        <td className="py-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase"
                            style={{
                              background: `color-mix(in oklab, ${SEVERITY_COLOR[f.severity]} 15%, transparent)`,
                              color: SEVERITY_COLOR[f.severity],
                            }}
                          >
                            {f.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
