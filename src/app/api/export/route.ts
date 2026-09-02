import { NextResponse } from "next/server";
import { buildExport, EXPORT_ITEMS } from "@/lib/export";

/**
 * Serves export files. Generating server-side keeps the whole dataset and the
 * serialisers out of the client bundle — the browser only ever receives the
 * file it actually asked for.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("dataset") ?? "";
  const ticker = searchParams.get("ticker") ?? undefined;

  const item = EXPORT_ITEMS.find((i) => i.id === id);
  if (!item) {
    return NextResponse.json(
      { error: `Unknown dataset "${id}"`, available: EXPORT_ITEMS.map((i) => i.id) },
      { status: 400 },
    );
  }

  // Reject anything that is not a plain ticker before it reaches a filename.
  const safeTicker =
    ticker && /^[A-Za-z.\-]{1,12}$/.test(ticker) ? ticker.toUpperCase() : undefined;

  const body = buildExport(item.id, safeTicker);
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = safeTicker ? `-${safeTicker}` : "";
  const filename = `esg-divergence-${item.id}${scope}-${stamp}.${item.format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        item.format === "json"
          ? "application/json; charset=utf-8"
          : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
