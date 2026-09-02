"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/ui";

interface Item {
  ticker: string;
  name: string;
  sector: string;
}

const MAX = 4;

export function CompanyPicker({
  companies,
  selected,
}: {
  companies: Item[];
  selected: string[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selected);

  function toggle(ticker: string) {
    const next = picked.includes(ticker)
      ? picked.filter((t) => t !== ticker)
      : picked.length >= MAX
        ? picked
        : [...picked, ticker];

    setPicked(next);
    router.replace(
      next.length ? `/compare?tickers=${next.join(",")}` : "/compare",
      { scroll: false },
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[11.5px] text-subtle">
        <span>
          {picked.length} of {MAX} selected
        </span>
        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPicked([]);
              router.replace("/compare", { scroll: false });
            }}
            className="font-medium text-brand underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {companies.map((c) => {
          const on = picked.includes(c.ticker);
          const full = !on && picked.length >= MAX;
          return (
            <button
              key={c.ticker}
              type="button"
              onClick={() => toggle(c.ticker)}
              disabled={full}
              title={c.name}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] font-semibold transition-colors",
                on
                  ? "border-transparent"
                  : "border-line bg-surface-2 text-muted hover:text-ink",
                full && "cursor-not-allowed opacity-40",
              )}
              style={
                on
                  ? { background: "var(--brand)", color: "var(--brand-fg)" }
                  : undefined
              }
            >
              {c.ticker}
            </button>
          );
        })}
      </div>
    </div>
  );
}
