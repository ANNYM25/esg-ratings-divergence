import { NextResponse } from "next/server";
import { runControversy } from "@/agents/controversy";
import { getCompany } from "@/data/companies";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  const run = await runControversy(ticker);
  return NextResponse.json(run, { status: run.unavailable ? 503 : 200 });
}
