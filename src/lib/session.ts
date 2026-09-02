/**
 * Demo session.
 *
 * This is a PROTOTYPE SIGN-IN, not authentication. The credentials are fixed,
 * printed on the login screen, and checked in the browser. There is no user
 * store, no password hashing and no server-side verification, because there is
 * nothing behind the login worth protecting — the whole dataset is public and
 * ships in the bundle.
 *
 * It exists to frame the tool for its intended audience (an investor or
 * analyst opening a research workspace) and to give the demo a natural
 * starting point. If this ever guards anything real, replace it wholesale with
 * a real identity provider.
 */

export const SESSION_COOKIE = "esg_demo_session";

export interface DemoUser {
  name: string;
  email: string;
  role: string;
  firm: string;
}

/** Displayed openly on the login screen — this is a demo, not a secret. */
export const DEMO_CREDENTIALS = {
  email: "analyst@xyz-capital.com",
  password: "esg2026",
};

/**
 * The firm is a deliberate placeholder. Naming a real asset manager would imply
 * an affiliation that does not exist, and this tool carries synthetic ratings.
 */
export const DEMO_USER: DemoUser = {
  name: "Anny Mondal",
  email: DEMO_CREDENTIALS.email,
  role: "ESG Research Analyst",
  firm: "XYZ Capital",
};

export function encodeSession(user: DemoUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function decodeSession(raw: string | undefined): DemoUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && typeof parsed.email === "string" && typeof parsed.name === "string") {
      return parsed as DemoUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
