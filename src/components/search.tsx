"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPANIES, SECTORS } from "@/data/companies";
import { cn } from "@/lib/ui";

const INDEX = COMPANIES.map((c) => ({
  ticker: c.ticker,
  name: c.name,
  sector: SECTORS[c.sector].short,
}));

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Reset is derived from the query rather than done in an effect: keeping a
  // "last query" marker avoids the cascading render an effect would cause.
  const [cursor, setCursor] = useState(0);
  const [cursorFor, setCursorFor] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (cursorFor !== query) {
    setCursorFor(query);
    setCursor(0);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDEX.filter(
      (c) =>
        c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    ).slice(0, 7);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  function go(ticker: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(`/company/${ticker}`);
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors focus-within:border-brand-300"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-subtle" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter" && results[cursor]) {
              go(results[cursor].ticker);
            }
          }}
          placeholder="Search a company or ticker…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          aria-label="Search companies"
        />
        <kbd className="mono hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-subtle sm:block">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div className="animate-fade-up absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface"
          style={{ boxShadow: "var(--shadow-float)" }}>
          {results.map((r, i) => (
            <button
              key={r.ticker}
              type="button"
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(r.ticker)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                i === cursor ? "bg-surface-2" : "",
              )}
            >
              <span className="tnum w-14 shrink-0 mono text-[12px] font-bold text-brand">
                {r.ticker}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{r.name}</span>
              <span className="shrink-0 text-[11px] text-subtle">{r.sector}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-line bg-surface px-3 py-3 text-[13px] text-muted"
          style={{ boxShadow: "var(--shadow-float)" }}>
          No company in the universe matches “{query.trim()}”.
        </div>
      )}
    </div>
  );
}
