"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEMO_USER,
  SESSION_COOKIE,
  decodeSession,
  initials,
  type DemoUser,
} from "@/lib/session";

/**
 * Reads the session in the browser rather than on the server, so that Shell
 * — and therefore every page — stays statically generated. There is only one
 * demo user, so DEMO_USER is the correct initial value and nothing flashes.
 */
export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Lazy initial state rather than an effect. The cookie is available
  // synchronously on the client, so reading it in an effect would only cause a
  // second render for no benefit. DEMO_USER is the correct server-render value
  // because there is exactly one demo user, so nothing flashes on hydration.
  const [user] = useState<DemoUser>(() => {
    if (typeof document === "undefined") return DEMO_USER;
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
      ?.split("=")
      .slice(1)
      .join("=");
    return decodeSession(raw) ?? DEMO_USER;
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function signOut() {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    // A hard navigation is required here, not a preference. The guard lives in
    // the proxy, and a client-side App Router navigation does not re-evaluate
    // it against a cookie that was only just cleared — the request goes out
    // against the router's existing state and renders the authenticated view.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface-2"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[12.5px] font-semibold">{user.name}</span>
          <span className="block text-[10.5px] text-subtle">{user.role}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`hidden h-3.5 w-3.5 text-subtle transition-transform sm:block ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 top-full z-50 mt-2 w-[248px] overflow-hidden rounded-2xl bg-surface"
          style={{ boxShadow: "var(--shadow-float)", border: "1px solid var(--border)" }}
        >
          <div className="border-b border-line px-4 py-3">
            <div className="text-[13px] font-semibold">{user.name}</div>
            <div className="mt-0.5 text-[11.5px] text-muted">{user.email}</div>
            <div className="mt-2 inline-flex rounded-md bg-brand-50 px-2 py-1 text-[10.5px] font-semibold text-brand">
              {user.firm} · {user.role}
            </div>
          </div>

          <div
            className="px-4 py-2.5 text-[10.5px] leading-relaxed"
            style={{ background: "var(--warn-soft)", color: "var(--text-muted)" }}
          >
            Demo session — presentation only, no account system behind it.
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium transition-colors hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-subtle" fill="none" aria-hidden>
              <path
                d="M15 12H4m0 0 4-4m-4 4 4 4M10 4h8a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
