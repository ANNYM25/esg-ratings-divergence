import { NextResponse } from "next/server";
import { availability } from "@/agents/runtime";
import { AGENTS } from "@/agents/registry";
import { SOURCE_ALLOWLIST } from "@/agents/tools";

export const dynamic = "force-dynamic";

/** Reports whether the agent layer is usable, so the UI can say so up front. */
export async function GET() {
  const a = availability();
  return NextResponse.json({
    configured: a.configured,
    reason: a.reason,
    setupHint: a.setupHint,
    providers: a.providers,
    assignment: a.assignment,
    agents: AGENTS.map((x) => ({ id: x.id, name: x.name, number: x.number })),
    sourceAllowlist: SOURCE_ALLOWLIST,
  });
}
