import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { universeStats } from "@/lib/divergence";
import { VALIDATION } from "@/lib/validate";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Demo sign-in for the ESG Divergence Analyser research workspace.",
};

export default function LoginPage() {
  const stats = universeStats();

  return (
    <div className="flex min-h-screen bg-backdrop">
      {/* ---------- Left: brand panel ---------- */}
      <div
        className="relative hidden w-[54%] flex-col justify-between overflow-hidden p-12 lg:flex xl:p-14"
        style={{ background: "var(--grad-sidebar)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)",
            backgroundSize: "30px 30px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(92,187,138,0.28) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-52 -left-32 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,160,106,0.20) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              background: "var(--brand-400)",
              boxShadow: "0 0 26px rgba(92,187,138,0.45)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path
                d="M6 17V9M12 17V5M18 17v-4"
                stroke="#0a2e1d"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <div className="font-display text-[20px] font-bold tracking-tight text-white">
              Divergence
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              ESG Ratings Analyser
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg animate-fade-up">
          <h1 className="font-display text-[44px] font-bold leading-[1.08] tracking-tight text-white xl:text-[52px]">
            Four raters.
            <br />
            One company.
            <br />
            <span style={{ color: "var(--brand-300)" }}>Four answers.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
            MSCI, Sustainalytics, LSEG and S&amp;P Global routinely disagree about the
            same company. This workspace quantifies the gap and explains exactly which
            methodology difference produced it.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {[
              "Methodology-level explanations",
              "Uncertainty bands",
              "Sector percentiles",
              "Full data export",
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full px-3 py-1.5 font-display text-[11.5px] font-semibold text-white/75"
                style={{
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="glass-dark mt-8 max-w-sm rounded-2xl p-5">
            <div className="mono text-[9.5px] uppercase tracking-[0.16em] text-white/40">
              Live universe
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: "Companies", value: stats.companies },
                { label: "Providers", value: stats.providers },
                { label: "Mean gap", value: stats.meanDivergence.toFixed(0) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-2.5"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div className="text-[9px] uppercase tracking-wider text-white/40">
                    {s.label}
                  </div>
                  <div
                    className="tnum font-display text-[22px] font-bold leading-tight"
                    style={{ color: "var(--brand-300)" }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-[11px] leading-relaxed text-white/45">
              Most divergent right now:{" "}
              <span className="font-semibold text-white/70">
                {stats.mostDivergent.name}
              </span>{" "}
              at {stats.mostDivergent.divergence.score.toFixed(1)}.
            </p>
          </div>
        </div>

        <p className="relative z-10 mono text-[11px] text-white/25">
          Research &amp; education tool · Not investment advice
        </p>
      </div>

      {/* ---------- Right: form ---------- */}
      <div className="backdrop-blooms relative flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="relative z-10 w-full max-w-[420px]">
          <LoginForm unverifiedCount={VALIDATION.total - VALIDATION.verified} />
        </div>
      </div>
    </div>
  );
}
