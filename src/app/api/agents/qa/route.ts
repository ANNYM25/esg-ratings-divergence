import { NextResponse } from "next/server";
import { buildQaAgent, qaChain } from "@/agents/qa";
import { availability, toUsage } from "@/agents/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * Answers a question about the dataset.
 *
 * Returns the answer alongside the full tool trace. Surfacing which
 * computation produced each figure is the point — an unverifiable chat answer
 * over financial data is worth very little, and the trace is what makes it
 * checkable.
 */
export async function POST(request: Request) {
  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }

  const chain = qaChain();
  if (chain.length === 0) {
    const a = availability();
    return NextResponse.json(
      { error: a.reason, unavailable: true, setupHint: a.setupHint },
      { status: 503 },
    );
  }

  // Walk the provider chain so a free-tier rate limit does not end the session.
  let lastError = "";
  for (const candidate of chain) {
    try {
      const result = await buildQaAgent(candidate).generate({ prompt: question });

      return NextResponse.json({
        answer: result.text,
        // The trace: every computation the answer rests on.
        //
        // Must come from steps, not result.toolCalls — the latter contains only
        // the LAST step's calls, and the last step is the text answer. Reading
        // it directly returned an empty trace in exactly the case the trace
        // exists for: when the agent actually used tools.
        toolCalls: result.steps.flatMap((s) =>
          s.toolCalls.map((c) => ({ tool: c.toolName, input: c.input })),
        ),
        steps: result.steps.length,
        usage: toUsage(result.usage),
        provider: candidate.providerLabel,
        model: candidate.modelId,
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(
    { error: `All ${chain.length} configured provider(s) failed. Last error: ${lastError}` },
    { status: 500 },
  );
}
