"use client";

import { useState } from "react";
import {
  DEMO_CREDENTIALS,
  DEMO_USER,
  SESSION_COOKIE,
  encodeSession,
} from "@/lib/session";

export function LoginForm({ unverifiedCount }: { unverifiedCount: number }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Purely cosmetic — makes the demo feel like a real sign-in.
    await new Promise((r) => setTimeout(r, 700));

    if (
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    ) {
      document.cookie = `${SESSION_COOKIE}=${encodeSession(DEMO_USER)}; path=/; max-age=86400; samesite=lax`;

      // Full navigation, not router.push. The guard lives in the proxy, and a
      // client-side App Router navigation will not re-evaluate it against a
      // cookie that was only just written — the request goes out against the
      // router's existing state and lands straight back on /login. A hard
      // navigation is also simply what a sign-in should do.
      const raw = new URLSearchParams(window.location.search).get("next");
      const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
      window.location.assign(next);
    } else {
      setError("Those credentials don't match. Use the demo pair below.");
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError("");
  }

  return (
    <div className="animate-fade-up">
      {/* Mobile logo */}
      <div className="mb-9 flex items-center gap-2.5 lg:hidden">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--grad-brand)" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M6 17V9M12 17V5M18 17v-4"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="font-display text-[19px] font-bold tracking-tight">
          Divergence
        </span>
      </div>

      <h2 className="font-display text-[30px] font-bold tracking-tight">
        Welcome back
      </h2>
      <p className="mt-1.5 text-[14px] text-muted">
        Sign in to your ESG research workspace
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Work email">
          <MailIcon />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analyst@firm.com"
            required
            autoComplete="username"
            className="w-full bg-transparent py-3 pl-10 pr-4 text-[14px] outline-none placeholder:text-subtle"
          />
        </Field>

        <Field label="Password">
          <LockIcon />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="w-full bg-transparent py-3 pl-10 pr-11 text-[14px] outline-none placeholder:text-subtle"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-brand"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </Field>

        {error && (
          <div
            className="animate-fade-in flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px]"
            style={{
              background: "rgb(159 18 57 / 0.07)",
              border: "1px solid rgb(159 18 57 / 0.16)",
              color: "var(--div-extreme)",
            }}
            role="alert"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
              <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.4" r="1.1" fill="currentColor" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[14px] font-semibold text-white transition-all active:scale-[0.985] disabled:opacity-75"
          style={{
            background: "var(--grad-brand)",
            boxShadow: loading ? "none" : "var(--shadow-glow)",
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M5 12h13m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Demo credentials — openly displayed. This is a prototype, not auth. */}
      <button
        type="button"
        onClick={fillDemo}
        className="mt-6 w-full rounded-xl p-4 text-left transition-colors hover:brightness-[0.99]"
        style={{
          background: "var(--brand-50)",
          border: "1px dashed rgb(26 107 65 / 0.28)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" />
          </svg>
          Demo credentials — click to fill
        </div>
        <p className="mono mt-1.5 text-[12px] text-muted">
          {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
        </p>
      </button>

      <div
        className="mt-4 rounded-xl px-3.5 py-3 text-[11.5px] leading-relaxed"
        style={{
          background: "var(--warn-soft)",
          border: "1px solid var(--warn-border)",
          color: "var(--text-muted)",
        }}
      >
        <span className="font-semibold" style={{ color: "var(--warn)" }}>
          Prototype notice.
        </span>{" "}
        This sign-in is presentation only — there is no account system and nothing
        behind it is private.
        {unverifiedCount > 0 && (
          <>
            {" "}
            All {unverifiedCount} rating records inside are illustrative
            placeholders, not published provider data.
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <span
        className="relative flex items-center rounded-xl transition-colors focus-within:border-brand-400"
        style={{
          background: "rgb(255 255 255 / 0.9)",
          border: "1.5px solid var(--border-strong)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        {children}
      </span>
    </label>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3.5 h-[15px] w-[15px] text-subtle"
      fill="none"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m3.5 7 8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3.5 h-[15px] w-[15px] text-subtle"
      fill="none"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden>
      <path
        d="M4 4l16 16M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4M6.5 8.2A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
