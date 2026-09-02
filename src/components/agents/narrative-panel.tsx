"use client";

import { useState } from "react";

/**
 * Streams the Narrative agent's analyst note on the company page.
 *
 * Deliberately opt-in rather than auto-running: the deterministic reasons are
 * already on the page and are the authoritative content. The narrative is a
 * readability layer over them, not a replacement, so it should not cost a model
 * call on every page view.
 */
export function NarrativePanel({ ticker }: { ticker: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setText("");
    setSource(null);

    try {
      const res = await fetch("/api/agents/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed (${res.status}).`);
        return;
      }

      setSource(res.headers.get("X-Narrative-Source"));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[13px] font-bold">
            Analyst note
            <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand">
              Agent 4
            </span>
          </h3>
          <p className="mt-0.5 text-[11px] text-muted">
            Rewrites the drivers above as prose. It may rephrase them and nothing
            else.
          </p>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand disabled:opacity-50"
        >
          {busy ? "Writing…" : text ? "Regenerate" : "Write the note"}
        </button>
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg px-3 py-2 text-[12px]"
          style={{
            background: "var(--div-extreme-soft)",
            color: "var(--div-extreme)",
          }}
        >
          {error}
        </p>
      )}

      {busy && !text && (
        <div className="mt-3 space-y-2">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-4/5" />
        </div>
      )}

      {text && (
        <>
          <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed">
            {text}
          </p>

          {source === "deterministic-fallback" && (
            <p
              className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed"
              style={{ background: "var(--warn-soft)", color: "var(--text-muted)" }}
            >
              <span className="font-semibold" style={{ color: "var(--warn)" }}>
                Deterministic fallback.
              </span>{" "}
              No AI Gateway credential is configured, so this is the rules-engine
              explanation rather than the agent&rsquo;s prose. It is a complete
              answer, just a blunter one.
            </p>
          )}

          {source === "agent" && (
            <p className="mt-3 text-[10.5px] leading-relaxed text-subtle">
              Written by the Narrative agent from the drivers above. It had no
              tools and no access to anything beyond the computed figures on this
              page, so it cannot have introduced a fact or a number of its own.
            </p>
          )}
        </>
      )}
    </div>
  );
}
