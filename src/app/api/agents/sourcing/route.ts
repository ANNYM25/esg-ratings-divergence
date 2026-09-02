import { NextResponse } from "next/server";
import { runSourcingPipeline } from "@/agents/orchestrator";
import { getCompany } from "@/data/companies";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs the Sourcing → Verifier pipeline for one company.
 *
 * Returns proposals, verdicts, and the accepted subset as a reviewable patch.
 * Nothing is written to the dataset — applying the patch is a human step.
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

  const result = await runSourcingPipeline(ticker);
  return NextResponse.json(result, { status: result.unavailable ? 503 : 200 });
}
