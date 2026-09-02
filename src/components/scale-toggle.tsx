"use client";

import { useState } from "react";
import { cn } from "@/lib/ui";

type View = "normalised" | "percentile";

/**
 * Toggles between the two comparison views.
 *
 * Both views are rendered on the server and one is hidden, so switching costs
 * nothing and the page stays fully server-rendered. Only this control is a
 * client component.
 */
export function ScaleToggle() {
  const [view, setView] = useState<View>("normalised");

  function select(next: View) {
    setView(next);
    document
      .querySelectorAll<HTMLElement>("[data-scale-view]")
      .forEach((el) => {
        el.hidden = el.dataset.scaleView !== next;
      });
  }

  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {(
        [
          ["normalised", "Score"],
          ["percentile", "Percentile"],
        ] as const
      ).map(([value, text]) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          className={cn(
            "rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            view === value
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
