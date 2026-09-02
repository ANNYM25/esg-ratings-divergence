import { NextResponse } from "next/server";
import { runWatcher } from "@/agents/watcher";
import { PROVIDER_IDS } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const provider = (body.provider ?? "").trim() as ProviderId;
  if (!PROVIDER_IDS.includes(provider)) {
    return NextResponse.json(
      { error: `Unknown provider. Expected one of: ${PROVIDER_IDS.join(", ")}.` },
      { status: 400 },
    );
  }

  const run = await runWatcher(provider);
  return NextResponse.json(run, { status: run.unavailable ? 503 : 200 });
}
