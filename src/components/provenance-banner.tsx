import Link from "next/link";
import { VALIDATION } from "@/lib/validate";

/**
 * Persistent, non-dismissible provenance notice.
 *
 * The whole credibility of a ratings-comparison tool rests on being honest
 * about where its numbers came from. While any record is unverified this
 * banner stays on every screen. Once the seed data is replaced with cited
 * provider figures and `verified` is flipped, it disappears on its own.
 */
export function ProvenanceBanner() {
  const unverified = VALIDATION.total - VALIDATION.verified;
  if (unverified === 0) return null;

  return (
    <div
      className="print-avoid-break flex items-start gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        background: "var(--warn-soft)",
        borderColor: "var(--warn-border)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="mt-[1px] h-[18px] w-[18px] shrink-0"
        style={{ color: "var(--warn)" }}
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7.5v5.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
      </svg>

      <div className="min-w-0 text-[12.5px] leading-relaxed">
        <span className="font-semibold" style={{ color: "var(--warn)" }}>
          Calibrated synthetic ratings — not published vendor scores.
        </span>{" "}
        <span className="text-muted">
          All {VALIDATION.total} records are synthetic. MSCI, Sustainalytics and
          LSEG scores are proprietary and licensed, with no lawful automated
          route to them, so these values were constructed instead: hand-written
          to reproduce documented divergence patterns, then calibrated so all six
          pairwise rank correlations fall inside the 0.38&ndash;0.71 range
          reported by Berg, Kölbel &amp; Rigobon (2022). The correlation{" "}
          <em>structure</em> is empirically grounded; no individual value is a
          real rating, and none may be cited as one.{" "}
          <Link
            href="/methodology#provenance"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--warn)" }}
          >
            How the calibration works →
          </Link>
        </span>
      </div>
    </div>
  );
}
