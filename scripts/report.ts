import { universe, universeStats, sectorDivergence, spearman, computeDivergence } from "../src/lib/divergence";
import { normalisedRatingsFor } from "../src/lib/normalise";
import { explain } from "../src/lib/explain";

const s = universeStats();
console.log(`\n=== UNIVERSE (${s.companies} companies x ${s.providers} providers) ===`);
console.log(`mean divergence ${s.meanDivergence}  max ${s.maxDivergence} (${s.mostDivergent.ticker})`);
console.log(`bands:`, s.counts, ` material share ${s.materialShare}%`);

console.log(`\n=== SPEARMAN ===`);
const ids = ["msci","sustainalytics","lseg","spcsa"] as const;
for (let i=0;i<ids.length;i++) for (let j=i+1;j<ids.length;j++)
  console.log(`  ${ids[i]} ~ ${ids[j]}: ${spearman(ids[i], ids[j])}`);

console.log(`\n=== SECTORS ===`);
for (const x of sectorDivergence()) console.log(`  ${x.sector.padEnd(12)} mean ${x.mean}  max ${x.max}`);

console.log(`\n=== TOP 6 DIVERGENT ===`);
for (const r of universe().slice(0,6)) console.log(`  ${r.ticker.padEnd(6)} ${String(r.divergence.score).padStart(5)}  ${r.divergence.band.padEnd(12)} consensus ${r.consensus}`);

for (const t of ["TSLA","META","XOM"]) {
  const d = computeDivergence(t); const e = explain(t);
  console.log(`\n=== ${t} ===`);
  for (const r of normalisedRatingsFor(t))
    console.log(`  ${r.provider.padEnd(15)} raw ${String(r.rawLabel).padEnd(16)} norm ${String(r.normalised).padStart(5)}  band ${r.band.low}-${r.band.high}  pctl ${r.sectorPercentile}`);
  console.log(`  score ${d.score} (${d.band})  pillars`, d.pillarRanges);
  console.log(`  SUMMARY: ${e.summary}`);
  console.log(`  attribution`, e.attribution, ` drivers: ${e.drivers.length}`);
  console.log(`  top: [${e.drivers[0].category}] ${e.drivers[0].title}`);
}
