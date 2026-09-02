/**
 * Seed-data calibration.
 *
 * THE PROBLEM THIS SOLVES
 * The first-pass seed values were written by hand from a consistent mental
 * model of each rater, which made them far too internally agreeable: pairwise
 * Spearman correlations came out between 0.33 and 0.94, with LSEG~S&P at 0.94
 * and MSCI~Sustainalytics at 0.88. Berg, Kölbel & Rigobon (2022) report
 * 0.38-0.71 across six major raters. Anyone who knows the literature would spot
 * the discrepancy immediately and conclude the data was naive.
 *
 * THE FIX
 * Real raters carry idiosyncratic variance: analyst judgement, proprietary
 * indicators, differing update timing. That variance is exactly what the
 * hand-written seed lacked. This script injects it as a deterministic,
 * seeded per-(company, provider) shock, then searches for the shock magnitude
 * whose resulting correlation structure best matches the published range.
 *
 * Deterministic by construction — same seed, same output, every run — so the
 * dataset stays reproducible and the calibration is auditable.
 *
 * Run:  npx tsx scripts/calibrate.mts          (report only)
 *       npx tsx scripts/calibrate.mts --write  (rewrite src/data/ratings.ts)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET_LOW = 0.38;
const TARGET_HIGH = 0.71;
const RATINGS_PATH = resolve("src/data/ratings.ts");

/* ---------------- deterministic PRNG (mulberry32) ---------------- */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Spearman ---------------- */
function rank(xs: number[]): number[] {
  const idx = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array<number>(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k].i] = avg;
    i = j + 1;
  }
  return r;
}

function spearman(a: number[], b: number[]): number {
  const ra = rank(a);
  const rb = rank(b);
  const n = ra.length;
  const ma = ra.reduce((x, y) => x + y, 0) / n;
  const mb = rb.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = ra[i] - ma;
    const y = rb[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const d = Math.sqrt(da * db);
  return d === 0 ? 0 : num / d;
}

/* ---------------- parse the SEED table ---------------- */
interface Row {
  raw: string;
  ticker: string;
  vals: Record<string, number[]>;
}

const PROVIDERS = ["msci", "sus", "lseg", "spcsa"] as const;
type P = (typeof PROVIDERS)[number];

// Provider-native bounds, so calibration never pushes a value off its own scale.
const BOUNDS: Record<P, { min: number; max: number; dp: number }> = {
  msci: { min: 0.4, max: 9.6, dp: 1 },
  sus: { min: 4, max: 46, dp: 1 },
  lseg: { min: 8, max: 96, dp: 0 },
  spcsa: { min: 8, max: 92, dp: 0 },
};

// Idiosyncratic scale as a fraction of each provider's usable range.
const SPAN: Record<P, number> = { msci: 10, sus: 50, lseg: 100, spcsa: 100 };

const source = readFileSync(RATINGS_PATH, "utf8");
const rowRe =
  /\{\s*t:\s*"([A-Z.]+)",\s*msci:\s*\[([^\]]+)\],\s*sus:\s*\[([^\]]+)\],\s*lseg:\s*\[([^\]]+)\],\s*spcsa:\s*\[([^\]]+)\]\s*\},?/g;

const rows: Row[] = [];
for (const m of source.matchAll(rowRe)) {
  const nums = (s: string) => s.split(",").map((x) => Number(x.trim()));
  rows.push({
    raw: m[0],
    ticker: m[1],
    vals: { msci: nums(m[2]), sus: nums(m[3]), lseg: nums(m[4]), spcsa: nums(m[5]) },
  });
}

if (rows.length === 0) {
  console.error("Could not parse the SEED table. Aborting without changes.");
  process.exit(1);
}
console.log(`parsed ${rows.length} companies\n`);

/* ---------------- apply shock ---------------- */
function clampRound(v: number, p: P): number {
  const b = BOUNDS[p];
  const c = Math.min(b.max, Math.max(b.min, v));
  const f = 10 ** b.dp;
  return Math.round(c * f) / f;
}

/**
 * Two knobs per provider.
 *
 * A uniform noise term alone cannot work: it lowers every pairwise correlation
 * together, so it drags the already-too-low Sustainalytics~LSEG pair further
 * out of range while barely denting the too-high pairs. Calibration needs to be
 * able to push correlations both ways.
 *
 *   w  shrink toward the cross-rater consensus  → RAISES correlation
 *   k  idiosyncratic per-rater shock            → LOWERS correlation
 *
 * Both are applied to the hand-written seed rather than replacing it, so the
 * deliberate narrative cases survive: Tesla rated well by the industry-relative
 * rater and poorly by the disclosure-weighted one, Meta's governance collapse,
 * the oil majors' absolute-versus-relative split.
 */
interface Knobs { w: Record<P, number>; k: Record<P, number> }

const toCommon = (p: P, v: number) =>
  p === "sus" ? 100 - (Math.min(v, 50) / 50) * 100 : p === "msci" ? v * 10 : v;
const fromCommon = (p: P, c: number) =>
  p === "sus" ? ((100 - c) / 100) * 50 : p === "msci" ? c / 10 : c;

/**
 * Sector membership, so calibration can decorrelate WITHIN a sector without
 * moving the sector's overall position for a given rater.
 *
 * This is the constraint that keeps the domain story intact. An unconstrained
 * shock dropped Exxon's MSCI score to 2.3/10, which flatly contradicts the
 * point the dataset exists to make: that industry-relative raters score oil
 * majors respectably because they are graded against other oil majors. The
 * statistics were right and the economics were wrong.
 */
const SECTOR_OF: Record<string, string> = {
  XOM: "energy", CVX: "energy", SHEL: "energy", BP: "energy", COP: "energy", OXY: "energy",
  AAPL: "tech", MSFT: "tech", NVDA: "tech", GOOGL: "tech", META: "tech", TSM: "tech",
  TSLA: "consumer", NKE: "consumer", KO: "consumer", PG: "consumer", MCD: "consumer", UL: "consumer",
  JPM: "fin", BAC: "fin", GS: "fin", HSBC: "fin", BLK: "fin", V: "fin",
  BA: "ind", CAT: "ind", GE: "ind", HON: "ind", UNP: "ind", RTX: "ind",
};

/** No single value may move more than this on the common 0-100 scale. */
const MAX_MOVE_COMMON = 18;

function applyKnobs(kn: Knobs): Row[] {
  // Consensus on the common scale — the shared signal every rater partly sees.
  const consensus = rows.map(
    (r) => PROVIDERS.reduce((a, p) => a + toCommon(p, r.vals[p][0]), 0) / PROVIDERS.length,
  );

  const shocked = rows.map((row, ri) => ({
    ...row,
    vals: Object.fromEntries(
      PROVIDERS.map((p, pi) => {
        const rand = prng(0x5eed * (ri + 1) + 977 * (pi + 1));
        const tuple = row.vals[p];

        const ownCommon = toCommon(p, tuple[0]);
        const pulled = ownCommon + kn.w[p] * (consensus[ri] - ownCommon);
        const shockCommon = (rand() * 2 - 1) * kn.k[p] * 100;
        const raw = pulled + shockCommon;
        // Cap movement so no company's rating becomes economically implausible.
        const targetCommon =
          ownCommon + Math.max(-MAX_MOVE_COMMON, Math.min(MAX_MOVE_COMMON, raw - ownCommon));

        // Move the overall score, then carry the same delta into the pillars so
        // each rater's view of a company stays internally coherent.
        const newOverall = fromCommon(p, targetCommon);
        const delta = newOverall - tuple[0];
        const jitter = () => (rand() * 2 - 1) * kn.k[p] * SPAN[p] * 0.4;

        return [
          p,
          [
            clampRound(newOverall, p),
            clampRound(tuple[1] + delta + jitter(), p),
            clampRound(tuple[2] + delta + jitter(), p),
            clampRound(tuple[3] + delta + jitter(), p),
          ],
        ];
      }),
    ) as Record<string, number[]>,
  }));

  // Re-centre every (provider, sector) group on its original mean, so each
  // rater's view of each sector is unchanged while companies move within it.
  for (const p of PROVIDERS) {
    for (const sector of new Set(Object.values(SECTOR_OF))) {
      const idx = rows
        .map((r, i) => (SECTOR_OF[r.ticker] === sector ? i : -1))
        .filter((i) => i >= 0);
      if (idx.length === 0) continue;

      const meanBefore =
        idx.reduce((a, i) => a + toCommon(p, rows[i].vals[p][0]), 0) / idx.length;
      const meanAfter =
        idx.reduce((a, i) => a + toCommon(p, shocked[i].vals[p][0]), 0) / idx.length;
      const drift = meanAfter - meanBefore;
      if (Math.abs(drift) < 0.01) continue;

      for (const i of idx) {
        const t = shocked[i].vals[p];
        const corrected = fromCommon(p, toCommon(p, t[0]) - drift);
        const d = corrected - t[0];
        shocked[i].vals[p] = [
          clampRound(corrected, p),
          clampRound(t[1] + d, p),
          clampRound(t[2] + d, p),
          clampRound(t[3] + d, p),
        ];
      }
    }
  }

  return shocked;
}

/** Correlations on the COMMON scale, matching what the app computes. */
function correlations(rs: Row[]) {
  const series = Object.fromEntries(
    PROVIDERS.map((p) => [p, rs.map((r) => toCommon(p, r.vals[p][0]))]),
  ) as Record<P, number[]>;

  const pairs: Array<{ a: P; b: P; rho: number }> = [];
  for (let i = 0; i < PROVIDERS.length; i++)
    for (let j = i + 1; j < PROVIDERS.length; j++)
      pairs.push({
        a: PROVIDERS[i],
        b: PROVIDERS[j],
        rho: spearman(series[PROVIDERS[i]], series[PROVIDERS[j]]),
      });
  return pairs;
}

/**
 * The narrative cases the explanation engine leans on. Calibration is not
 * allowed to flip them — a statistically tidy dataset that no longer tells the
 * story would be a worse dataset.
 */
const MUST_HOLD: Array<{ ticker: string; higher: P; lower: P; why: string }> = [
  { ticker: "TSLA", higher: "msci", lower: "lseg", why: "industry-relative rewards the product; disclosure-weighted punishes thin reporting" },
  { ticker: "META", higher: "lseg", lower: "msci", why: "strong disclosure vs governance and controversy collapse" },
  { ticker: "XOM", higher: "lseg", lower: "sus", why: "relative-to-peers vs absolute sector exposure" },
  { ticker: "V", higher: "msci", lower: "spcsa", why: "low operational risk vs thin disclosure" },
];

function narrativeBreaks(rs: Row[]): string[] {
  const broken: string[] = [];
  for (const c of MUST_HOLD) {
    const r = rs.find((x) => x.ticker === c.ticker);
    if (!r) continue;
    if (toCommon(c.higher, r.vals[c.higher][0]) <= toCommon(c.lower, r.vals[c.lower][0]))
      broken.push(`${c.ticker}: ${c.higher} should exceed ${c.lower} (${c.why})`);
  }
  return broken;
}

/* ---------------- search ---------------- */
const LIT_MID = (TARGET_LOW + TARGET_HIGH) / 2;

function cost(rs: Row[]): number {
  const pairs = correlations(rs);
  let c = pairs.reduce((acc, p) => {
    const out =
      p.rho > TARGET_HIGH ? (p.rho - TARGET_HIGH) * 25
      : p.rho < TARGET_LOW ? (TARGET_LOW - p.rho) * 25
      : 0;
    return acc + out + Math.abs(p.rho - LIT_MID) * 0.35;
  }, 0);
  // Breaking a narrative case is worse than any correlation miss.
  c += narrativeBreaks(rs).length * 50;
  return c;
}

const searchRand = prng(20260822);
let best = { knobs: null as Knobs | null, cost: Infinity, rows };

for (let iter = 0; iter < 6000; iter++) {
  const knobs: Knobs = {
    w: Object.fromEntries(PROVIDERS.map((p) => [p, searchRand() * 0.55])) as Record<P, number>,
    k: Object.fromEntries(PROVIDERS.map((p) => [p, searchRand() * 0.22])) as Record<P, number>,
  };
  const candidate = applyKnobs(knobs);
  const c = cost(candidate);
  if (c < best.cost) best = { knobs, cost: c, rows: candidate };
}

console.log("BEFORE (hand-written seed)");
correlations(rows).forEach((p) =>
  console.log(
    `  ${p.a.padEnd(6)}~ ${p.b.padEnd(6)} ${p.rho.toFixed(2)}  ${p.rho > TARGET_HIGH || p.rho < TARGET_LOW ? "← outside 0.38-0.71" : "✓"}`,
  ),
);

console.log("\nAFTER (calibrated)");
correlations(best.rows).forEach((p) =>
  console.log(
    `  ${p.a.padEnd(6)}~ ${p.b.padEnd(6)} ${p.rho.toFixed(2)}  ${p.rho > TARGET_HIGH || p.rho < TARGET_LOW ? "← STILL OUTSIDE" : "✓"}`,
  ),
);

const inRange = correlations(best.rows).filter(
  (p) => p.rho >= TARGET_LOW && p.rho <= TARGET_HIGH,
).length;
console.log(`\n${inRange}/6 pairs inside the published range`);
console.log("knobs:", JSON.stringify(best.knobs));

const breaks = narrativeBreaks(best.rows);
console.log(
  breaks.length === 0
    ? "narrative cases: all preserved ✓"
    : "narrative cases BROKEN:\n  " + breaks.join("\n  "),
);

/* ---------------- write back ---------------- */
if (process.argv.includes("--write")) {
  const adjusted = best.rows;
  let out = source;
  adjusted.forEach((row, i) => {
    const fmt = (p: P) =>
      row.vals[p]
        .map((v) => (BOUNDS[p].dp === 0 ? String(Math.round(v)) : v.toFixed(1)))
        .join(", ");
    const replacement = `{ t: "${row.ticker}",${" ".repeat(Math.max(1, 6 - row.ticker.length))}msci: [${fmt("msci")}], sus: [${fmt("sus")}], lseg: [${fmt("lseg")}], spcsa: [${fmt("spcsa")}] },`;
    out = out.replace(rows[i].raw, replacement);
  });
  writeFileSync(RATINGS_PATH, out);
  console.log(`\nwrote ${adjusted.length} calibrated rows to ${RATINGS_PATH}`);
} else {
  console.log("\n(report only — pass --write to apply)");
}
