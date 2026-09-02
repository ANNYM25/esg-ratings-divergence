import { describe, it, expect } from "vitest";
import { analysisTools, isAllowedSource, SOURCE_ALLOWLIST } from "@/agents/tools";
import { AGENTS } from "@/agents/registry";
import { availability } from "@/agents/runtime";
import { buildNarrativeBrief, fallbackNarrative } from "@/agents/narrative";
import { computeDivergence } from "./divergence";

/** Tools are heterogeneous by design, so this shim is intentionally loose. */
async function call(
  tool: unknown,
  input: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const t = tool as {
    execute?: (i: unknown, c: { toolCallId: string; messages: [] }) => Promise<unknown>;
  };
  if (!t.execute) throw new Error("tool has no execute()");
  return t.execute(input, { toolCallId: "test", messages: [] });
}

describe("engine exposed as agent tools", () => {
  it("returns the whole universe", async () => {
    expect(await call(analysisTools.listCompanies, {})).toHaveLength(30);
  });

  it("filters by sector", async () => {
    expect(await call(analysisTools.listCompanies, { sector: "energy" })).toHaveLength(6);
  });

  it("returns an error object for an unknown ticker rather than throwing", async () => {
    const r = await call(analysisTools.getCompanyProfile, { ticker: "ZZZZ" });
    expect(r.error).toBeTruthy();
  });

  it("tells the model that Sustainalytics runs lower-is-better", async () => {
    // The single most misread fact in ESG data. If the tool does not say so
    // explicitly, a model will read a high risk score as a good result.
    const r = await call(analysisTools.getRatings, { ticker: "XOM" });
    const sus = r.ratings.find(
      (x: { provider: string }) => x.provider === "Sustainalytics",
    );
    expect(sus.scaleDirection).toContain("LOWER IS BETTER");
  });

  it("returns figures identical to the engine, never approximations", async () => {
    // This is the architectural invariant: a model can CALL the maths but can
    // never invent it. If the tool ever drifts from the engine, that guarantee
    // is broken.
    for (const ticker of ["V", "XOM", "TSLA", "META"]) {
      const tool = await call(analysisTools.getDivergence, { ticker });
      const engine = computeDivergence(ticker);
      expect(tool.score).toBe(engine.score);
      expect(tool.levelSpread).toBe(engine.normalisedRange);
      expect(tool.rankSpread).toBe(engine.percentileRange);
    }
  });

  it("surfaces the divergence formula to the model", async () => {
    const r = await call(analysisTools.getDivergence, { ticker: "V" });
    expect(r.formula).toBe("score = max(levelSpread, rankSpread)");
  });

  it("carries the academic citation into the tool output", async () => {
    const r = await call(analysisTools.getDivergenceReasons, { ticker: "XOM" });
    expect(r.attributionFramework).toContain("Review of Finance");
    expect(r.drivers.length).toBeGreaterThanOrEqual(5);
  });

  it("ranks companies in descending divergence order", async () => {
    const r = await call(analysisTools.rankCompanies, { limit: 10 });
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].divergence).toBeGreaterThanOrEqual(r[i].divergence);
    }
  });
});

describe("source allowlist — the terms-of-service guardrail", () => {
  it.each([
    ["https://www.msci.com/our-solutions/esg-investing/esg-ratings"],
    ["https://www.sustainalytics.com/esg-rating/tesla-inc/1007903501"],
    ["https://www.lseg.com/en/data-analytics/sustainable-finance/esg-scores"],
  ])("blocks the proprietary rating page %s", (url) => {
    // Pointing an agent at these is the same violation as scraping by hand,
    // only faster and more traceable.
    expect(isAllowedSource(url).ok).toBe(false);
  });

  it("rejects plain http", () => {
    expect(isAllowedSource("http://spglobal.com/esg").ok).toBe(false);
  });

  it("is not fooled by an allowlisted host appearing in the path", () => {
    expect(isAllowedSource("https://evil.example.com/spglobal.com").ok).toBe(false);
  });

  it.each([
    ["https://www.spglobal.com/esg/scores/results"],
    ["https://www.cdp.net/en/responses"],
  ])("allows the genuinely public source %s", (url) => {
    expect(isAllowedSource(url).ok).toBe(true);
  });

  it("contains no proprietary rater", () => {
    expect(
      SOURCE_ALLOWLIST.some((d) => /msci|sustainalytics|lseg|refinitiv/i.test(d)),
    ).toBe(false);
  });
});

describe("narrative agent constraints", () => {
  it("builds a closed brief containing every figure it may cite", () => {
    const brief = buildNarrativeBrief("META")!;
    expect(brief).toContain("composite score:");
    expect(brief).toContain("DETERMINISTIC DRIVERS");
    expect(brief).toContain("only permitted explanations");
  });

  it("falls back to a complete deterministic answer, not a stub", () => {
    const text = fallbackNarrative("META");
    expect(text.length).toBeGreaterThan(100);
    expect(text).toContain("Meta");
  });
});

describe("agent registry", () => {
  it("registers six agents numbered 1-6", () => {
    expect(AGENTS).toHaveLength(6);
    expect(AGENTS.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("gives the narrative agent no tools at all", () => {
    // Giving it tools would let it look for material the rules engine did not
    // sanction; its output must be a restatement, not a new claim.
    expect(AGENTS.find((a) => a.id === "narrative")!.tools).toHaveLength(0);
  });

  it("documents a guardrail for every agent", () => {
    for (const a of AGENTS) expect(a.guardrail.length).toBeGreaterThan(40);
  });
});

describe("runtime availability", () => {
  it("reports cleanly and offers a setup hint when unconfigured", () => {
    const a = availability();
    if (!a.configured) {
      expect(a.reason).toBeTruthy();
      expect(a.setupHint.length).toBeGreaterThan(20);
    }
    expect(a.providers.length).toBeGreaterThan(0);
  });
});
