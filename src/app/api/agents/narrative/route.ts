import { NextResponse } from "next/server";
import {
  buildNarrativeAgent,
  narrativeModel,
  buildNarrativeBrief,
  fallbackNarrative,
} from "@/agents/narrative";
import { getCompany } from "@/data/companies";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Streams the analyst narrative for one company.
 *
 * When no credential is configured this returns the deterministic rules-engine
 * summary instead of an error. That fallback is not a degraded stub — it is a
 * complete and correct explanation, just a blunter one, which is exactly why
 * the narrative layer was kept optional in the first place.
 */
export async function POST(request: Request) {
  let body: { ticker?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const ticker = (body.ticker ?? "").trim().toUpperCase();
  if (!getCompany(ticker)) {
    return NextResponse.json(
      { error: `"${ticker}" is not in the analysed universe.` },
      { status: 400 },
    );
  }

  const brief = buildNarrativeBrief(ticker);
  if (!brief) {
    return NextResponse.json({ error: "Could not build the brief." }, { status: 500 });
  }

  const chosen = narrativeModel();
  if (!chosen) {
    return new Response(fallbackNarrative(ticker), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Narrative-Source": "deterministic-fallback",
      },
    });
  }

  try {
    const result = await buildNarrativeAgent(chosen).stream({
      prompt: `Write the explanatory note for this divergence analysis.

Everything you may reference is below. Do not introduce anything else.

${brief}`,
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Narrative-Source": "agent",
        "X-Narrative-Provider": chosen.providerLabel,
        "X-Narrative-Model": chosen.modelId,
      },
    });
  } catch (err) {
    // A model failure must not blank the page — fall back to the engine.
    return new Response(fallbackNarrative(ticker), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Narrative-Source": "deterministic-fallback",
        "X-Narrative-Error": err instanceof Error ? err.message.slice(0, 200) : "unknown",
      },
    });
  }
}
