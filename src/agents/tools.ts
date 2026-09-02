/**
 * The deterministic engine, exposed to agents as tools.
 *
 * This is the mechanism behind the architectural rule: a model can CALL
 * `computeDivergence("TSLA")` and get 33.4, but it has no way to produce that
 * number itself. Every figure an agent reports is therefore traceable to a
 * tested function in src/lib/, not to the model's recall.
 *
 * The fetchPage tool is domain-allowlisted on purpose. Agents pointed at the
 * open web will happily scrape MSCI's rating-lookup page, which is the same
 * terms-of-service problem as doing it by hand — only faster and more
 * traceable. The allowlist confines sourcing to genuinely open data.
 */

import { tool } from "ai";
import { z } from "zod";

import { COMPANIES, SECTORS, getCompany, companiesInSector } from "@/data/companies";
import { ratingsFor } from "@/data/ratings";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import { normalisedRatingsFor, sectorMedian, consensusScore } from "@/lib/normalise";
import {
  computeDivergence,
  universe,
  universeStats,
  sectorDivergence,
  correlationMatrix,
  BANDS,
  PROFILES,
} from "@/lib/divergence";
import { explain, CATEGORY_LABELS, LITERATURE_ATTRIBUTION } from "@/lib/explain";

/* ------------------------------------------------------------------ *
 * Read-only tools over the deterministic core
 * ------------------------------------------------------------------ */

export const listCompanies = tool({
  description:
    "List every company in the analysed universe with its ticker, name and sector. Use this to resolve a company name to a ticker before calling other tools.",
  inputSchema: z.object({
    sector: z
      .enum(["energy", "technology", "consumer", "financials", "industrials"])
      .optional()
      .describe("Restrict to one sector."),
  }),
  execute: async ({ sector }) => {
    const list = sector ? companiesInSector(sector) : COMPANIES;
    return list.map((c) => ({
      ticker: c.ticker,
      name: c.name,
      sector: SECTORS[c.sector].name,
      subIndustry: c.subIndustry,
    }));
  },
});

export const getCompanyProfile = tool({
  description:
    "Get a company's identity plus the qualitative attributes the divergence rules engine reasons over (disclosure level, controversy level, carbon intensity, product alignment, governance and social flags).",
  inputSchema: z.object({
    ticker: z.string().describe("Ticker symbol, e.g. TSLA."),
  }),
  execute: async ({ ticker }) => {
    const c = getCompany(ticker);
    if (!c) return { error: `No company in the universe with ticker "${ticker}".` };
    return {
      ticker: c.ticker,
      name: c.name,
      sector: SECTORS[c.sector].name,
      subIndustry: c.subIndustry,
      country: c.country,
      marketCapUsdB: c.marketCapUsdB,
      attributes: c.attributes,
    };
  },
});

export const getRatings = tool({
  description:
    "Get every provider's rating for a company: the provider-native score, the normalised 0-100 value (higher is always better), the uncertainty band, and the sector percentile. Use this instead of recalling any rating from memory.",
  inputSchema: z.object({
    ticker: z.string().describe("Ticker symbol, e.g. XOM."),
  }),
  execute: async ({ ticker }) => {
    const c = getCompany(ticker);
    if (!c) return { error: `No company in the universe with ticker "${ticker}".` };

    const raw = ratingsFor(ticker);
    return {
      ticker: c.ticker,
      name: c.name,
      consensus: consensusScore(ticker),
      sectorMedian: sectorMedian(ticker),
      ratings: normalisedRatingsFor(ticker).map((r) => {
        const source = raw.find((x) => x.provider === r.provider);
        return {
          provider: PROVIDERS[r.provider].shortName,
          nativeRating: r.rawLabel,
          nativeScale: PROVIDERS[r.provider].scale.unit,
          scaleDirection:
            PROVIDERS[r.provider].scale.direction === "lower_better"
              ? "LOWER IS BETTER (risk score)"
              : "higher is better",
          normalised: r.normalised,
          uncertaintyBand: [r.band.low, r.band.high],
          sectorPercentile: r.sectorPercentile,
          pillars: r.pillars,
          asOf: r.asOf,
          provenance: source?.provenance,
          verified: source?.verified ?? false,
        };
      }),
    };
  },
});

export const getDivergence = tool({
  description:
    "Compute the divergence metrics for a company: composite score, band, disagreement type, level spread, rank spread, pairwise gaps and per-pillar spreads. This is the authoritative source for every divergence figure.",
  inputSchema: z.object({
    ticker: z.string().describe("Ticker symbol, e.g. META."),
  }),
  execute: async ({ ticker }) => {
    const c = getCompany(ticker);
    if (!c) return { error: `No company in the universe with ticker "${ticker}".` };

    const d = computeDivergence(ticker);
    return {
      ticker: d.ticker,
      score: d.score,
      band: BANDS[d.band].label,
      bandMeaning: BANDS[d.band].description,
      disagreementType: PROFILES[d.profile].label,
      disagreementMeaning: PROFILES[d.profile].description,
      levelSpread: d.normalisedRange,
      rankSpread: d.percentileRange,
      formula: "score = max(levelSpread, rankSpread)",
      stdDev: d.stdDev,
      widestPair: d.widestPair
        ? {
            providers: [
              PROVIDERS[d.widestPair.a].shortName,
              PROVIDERS[d.widestPair.b].shortName,
            ],
            gap: d.widestPair.normalisedDelta,
          }
        : null,
      pairwiseGaps: d.pairs.map((p) => ({
        pair: `${PROVIDERS[p.a].shortName} vs ${PROVIDERS[p.b].shortName}`,
        levelGap: p.normalisedDelta,
        rankGap: p.percentileDelta,
      })),
      pillarSpreads: d.pillarRanges,
    };
  },
});

export const getDivergenceReasons = tool({
  description:
    "Get the deterministic explanation for WHY two providers disagree about a company: the ranked drivers, each attributed to scope, measurement or weight, plus the attribution percentages. These drivers are the ONLY permitted basis for any explanation you write.",
  inputSchema: z.object({
    ticker: z.string().describe("Ticker symbol."),
  }),
  execute: async ({ ticker }) => {
    const c = getCompany(ticker);
    if (!c) return { error: `No company in the universe with ticker "${ticker}".` };

    const e = explain(ticker);
    return {
      ticker: e.ticker,
      summary: e.summary,
      attribution: e.attribution,
      literatureAttribution: LITERATURE_ATTRIBUTION,
      attributionFramework:
        "Berg, Kölbel & Rigobon (2022), 'Aggregate Confusion: The Divergence of ESG Ratings', Review of Finance 26(6), 1315-1344",
      drivers: e.drivers.map((d) => ({
        title: d.title,
        category: CATEGORY_LABELS[d.category].label,
        attribute: d.attribute,
        detail: d.detail,
        favours: d.favours ? PROVIDERS[d.favours].shortName : null,
        weight: d.weight,
        confidence: d.confidence,
      })),
    };
  },
});

export const getProviderMethodology = tool({
  description:
    "Get the encoded methodology profile for one or all rating providers: scale and direction, what it measures, benchmark basis, materiality lens, non-disclosure treatment, controversy handling, update cadence, input data mix and weighting scheme.",
  inputSchema: z.object({
    provider: z
      .enum(["msci", "sustainalytics", "lseg", "spcsa", "all"])
      .describe("Which provider, or 'all'."),
  }),
  execute: async ({ provider }) => {
    const ids = provider === "all" ? PROVIDER_IDS : [provider];
    return ids.map((id) => {
      const p = PROVIDERS[id];
      return {
        id: p.id,
        name: p.name,
        owner: p.owner,
        scale: p.scale.unit,
        direction:
          p.scale.direction === "lower_better"
            ? "LOWER IS BETTER"
            : "higher is better",
        buckets: p.scale.buckets?.map((b) => `${b.label} (${b.min}-${b.max})`),
        measures: p.framing,
        benchmark: p.benchmark,
        materiality: p.materiality,
        nonDisclosure: p.disclosure,
        controversies: p.controversy,
        cadence: p.cadence,
        dataMix: p.dataMix,
        weighting: p.weighting,
        selfDescription: p.selfDescription,
        sourceUrl: p.sourceUrl,
      };
    });
  },
});

export const getUniverseStats = tool({
  description:
    "Get universe-level analytics: mean and maximum divergence, band distribution, the most divergent company, per-sector means, and the Spearman rank correlation matrix between providers.",
  inputSchema: z.object({}),
  execute: async () => {
    const s = universeStats();
    return {
      companies: s.companies,
      providers: s.providers,
      meanDivergence: s.meanDivergence,
      maxDivergence: s.maxDivergence,
      mostDivergent: {
        ticker: s.mostDivergent.ticker,
        name: s.mostDivergent.name,
        score: s.mostDivergent.divergence.score,
      },
      bandCounts: s.counts,
      materialDisagreementPercent: s.materialShare,
      bySector: sectorDivergence().map((x) => ({
        sector: SECTORS[x.sector].name,
        mean: x.mean,
        max: x.max,
      })),
      spearmanCorrelation: correlationMatrix(),
      correlationNote:
        "Berg, Kölbel & Rigobon (2022) report pairwise correlations of roughly 0.38-0.71 between six major raters.",
    };
  },
});

export const rankCompanies = tool({
  description:
    "Rank every company in the universe by divergence score, highest first. Use for questions about which companies the raters disagree about most.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(30).default(10),
  }),
  execute: async ({ limit }) =>
    universe()
      .slice(0, limit)
      .map((r) => ({
        ticker: r.ticker,
        name: r.name,
        sector: SECTORS[r.sector].name,
        divergence: r.divergence.score,
        band: BANDS[r.divergence.band].label,
        disagreementType: PROFILES[r.divergence.profile].label,
        consensus: r.consensus,
      })),
});

/* ------------------------------------------------------------------ *
 * fetchPage — the one tool that reaches outside
 * ------------------------------------------------------------------ */

/**
 * Hosts an agent may read.
 *
 * Deliberately excludes MSCI, Sustainalytics and LSEG rating-lookup pages.
 * Their ratings are proprietary and their terms prohibit automated retrieval;
 * pointing an agent at them would be the same violation as scraping by hand.
 * What remains is genuinely open: S&P Global's published CSA scores, CDP's
 * public disclosure scores, and companies' own sustainability reporting.
 */
export const SOURCE_ALLOWLIST = [
  "spglobal.com",
  "cdp.net",
  "unglobalcompact.org",
  "globalreporting.org",
  "sasb.org",
  "issgovernance.com",
  "sustainability-reports.com",
  "responsibilityreports.com",
] as const;

/** Company-owned domains are allowed — a company's own report is a fair source. */
const COMPANY_DOMAINS = COMPANIES.map((c) =>
  c.name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)[0],
);

export function isAllowedSource(url: string): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Only https is permitted." };
  }

  const host = parsed.hostname.toLowerCase();

  if (SOURCE_ALLOWLIST.some((d) => host === d || host.endsWith(`.${d}`))) {
    return { ok: true };
  }

  // A company's own domain is acceptable for its own sustainability report.
  if (COMPANY_DOMAINS.some((d) => d.length > 3 && host.includes(d))) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `Host "${host}" is not on the source allowlist. Proprietary rating-lookup pages (MSCI, Sustainalytics, LSEG) are deliberately excluded — their terms prohibit automated retrieval. Permitted: ${SOURCE_ALLOWLIST.join(", ")}, or a company's own domain.`,
  };
}

/** Strips a fetched HTML document down to something a model can read. */
function extractText(html: string, limit = 12_000): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export const fetchPage = tool({
  description:
    "Fetch and read a public web page, returning its visible text. Only hosts on the source allowlist are permitted — proprietary rating-lookup pages are blocked by design. Always record the exact URL you fetched so it can be cited.",
  inputSchema: z.object({
    url: z.string().describe("Full https URL of the page to read."),
  }),
  execute: async ({ url }) => {
    const check = isAllowedSource(url);
    if (!check.ok) return { error: check.reason, url };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "ESG-Divergence-Analyser/1.0 (research tool; contact via repository)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { error: `HTTP ${res.status} ${res.statusText}`, url };
      }

      const html = await res.text();
      return { url, status: res.status, text: extractText(html) };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Fetch failed.",
        url,
      };
    }
  },
});

/* ------------------------------------------------------------------ *
 * Tool bundles
 * ------------------------------------------------------------------ */

/** Everything needed to answer questions about the dataset. */
export const analysisTools = {
  listCompanies,
  getCompanyProfile,
  getRatings,
  getDivergence,
  getDivergenceReasons,
  getProviderMethodology,
  getUniverseStats,
  rankCompanies,
};

/** Analysis tools plus outbound reading, for sourcing and verification. */
export const researchTools = {
  ...analysisTools,
  fetchPage,
};
