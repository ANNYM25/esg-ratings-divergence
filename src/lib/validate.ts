/**
 * Ingestion validator.
 *
 * A rating without provenance is not admissible. This runs over the seed data
 * at module load and its results are surfaced in the UI — the application is
 * designed to be visibly honest about the state of its own inputs rather than
 * quietly presenting placeholders as fact.
 */

import { COMPANY_BY_TICKER } from "@/data/companies";
import { RATINGS } from "@/data/ratings";
import { PROVIDERS } from "./providers";
import type { RatingRecord } from "./types";

export interface ValidationIssue {
  severity: "error" | "warning";
  ticker: string;
  provider: string;
  message: string;
}

const STALE_AFTER_DAYS = 400;

export function validateRatings(records: RatingRecord[] = RATINGS): {
  issues: ValidationIssue[];
  total: number;
  verified: number;
  illustrative: number;
} {
  const issues: ValidationIssue[] = [];
  const now = Date.now();

  for (const r of records) {
    const scale = PROVIDERS[r.provider]?.scale;

    if (!COMPANY_BY_TICKER.has(r.ticker)) {
      issues.push({
        severity: "error",
        ticker: r.ticker,
        provider: r.provider,
        message: "Rating references a ticker that is not in the universe.",
      });
      continue;
    }

    if (!scale) {
      issues.push({
        severity: "error",
        ticker: r.ticker,
        provider: r.provider,
        message: "Unknown provider.",
      });
      continue;
    }

    if (r.rawScore < scale.min || r.rawScore > scale.max) {
      issues.push({
        severity: "error",
        ticker: r.ticker,
        provider: r.provider,
        message: `Score ${r.rawScore} falls outside the declared scale ${scale.min}–${scale.max}.`,
      });
    }

    if (r.provenance !== "illustrative" && !r.sourceUrl) {
      issues.push({
        severity: "error",
        ticker: r.ticker,
        provider: r.provider,
        message: "Non-illustrative record is missing a source URL.",
      });
    }

    const ageDays = (now - Date.parse(r.asOf)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays > STALE_AFTER_DAYS) {
      issues.push({
        severity: "warning",
        ticker: r.ticker,
        provider: r.provider,
        message: `As-of date is ${Math.round(ageDays)} days old.`,
      });
    }
  }

  return {
    issues,
    total: records.length,
    verified: records.filter((r) => r.verified).length,
    illustrative: records.filter((r) => r.provenance === "illustrative").length,
  };
}

export const VALIDATION = validateRatings();
