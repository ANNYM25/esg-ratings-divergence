import type { DivergenceBand, ProviderId } from "./types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const BAND_COLOR: Record<
  DivergenceBand,
  { fg: string; soft: string; label: string }
> = {
  aligned: { fg: "var(--div-aligned)", soft: "var(--div-aligned-soft)", label: "Aligned" },
  mild: { fg: "var(--div-mild)", soft: "var(--div-mild-soft)", label: "Mild" },
  significant: {
    fg: "var(--div-significant)",
    soft: "var(--div-significant-soft)",
    label: "Significant",
  },
  extreme: { fg: "var(--div-extreme)", soft: "var(--div-extreme-soft)", label: "Extreme" },
};

export const PROVIDER_COLOR: Record<ProviderId, string> = {
  msci: "var(--provider-msci)",
  sustainalytics: "var(--provider-sustainalytics)",
  lseg: "var(--provider-lseg)",
  spcsa: "var(--provider-spcsa)",
};

/** Interpolate the severity ramp for continuous surfaces such as heatmaps. */
export function rampColor(score: number): string {
  if (score <= 15) return "var(--div-aligned)";
  if (score <= 35) return "var(--div-mild)";
  if (score <= 60) return "var(--div-significant)";
  return "var(--div-extreme)";
}

export function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}
