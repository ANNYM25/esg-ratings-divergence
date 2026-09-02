"use client";

import { useState } from "react";
import { ErrorNote } from "./controls";

interface Answer {
  answer: string;
  toolCalls: Array<{ tool: string; input: unknown }>;
  steps: number;
  usage?: { input?: number; output?: number; total?: number };
}

/**
 * The tool trace is rendered alongside every answer on purpose. A chat reply
 * over financial data that you cannot check is worth very little; showing which
 * computation produced each figure is what makes it usable.
 */
export function QaPanel({
  suggestions,
  configured,
}: {
  suggestions: string[];
  configured: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asked, setAsked] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setAsked(q);
    try {
      const res = await fetch("/api/agents/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? `Request failed (${res.status}).`);
      else setAnswer(data as Answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about the 30-company universe…"
          disabled={!configured}
          className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-brand-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !configured || !question.trim()}
          className="shrink-0 rounded-xl px-4 py-2.5 font-display text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          style={{ background: "var(--grad-brand)", boxShadow: "var(--shadow-glow)" }}
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={!configured || busy}
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-left text-[11px] text-muted transition-colors hover:border-brand-300 hover:text-brand disabled:opacity-45"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {busy && (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-5/6" />
        </div>
      )}

      {answer && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11.5px] text-subtle">
            <span className="font-semibold">Asked:</span> {asked}
          </p>

          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
            {answer.answer}
          </div>

          {answer.toolCalls.length > 0 && (
            <div className="mt-4 rounded-xl bg-surface-2 p-3.5">
              <div className="eyebrow mb-2">
                Computation trace — {answer.toolCalls.length} tool call
                {answer.toolCalls.length === 1 ? "" : "s"} across {answer.steps} step
                {answer.steps === 1 ? "" : "s"}
              </div>
              <div className="space-y-1.5">
                {answer.toolCalls.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mono mt-0.5 shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-brand">
                      {c.tool}
                    </span>
                    <span className="mono min-w-0 flex-1 truncate text-[10.5px] text-subtle">
                      {JSON.stringify(c.input)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-subtle">
                Every figure above came from one of these calls into the
                deterministic engine, not from the model&rsquo;s recall.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
