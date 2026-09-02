/** Proves the fallback chain: forces a bad primary and watches it recover. */
import { runAgent, resolveChain } from "../src/agents/runtime";
import { buildQaAgent } from "../src/agents/qa";

const chain = resolveChain("reasoning");
console.log("chain:", chain.map((c) => `${c.providerLabel}/${c.modelId}`).join("  →  "), "\n");

const run = await runAgent<string>("qa", "reasoning", async (m) => {
  console.log(`  trying ${m.providerLabel} (${m.modelId})…`);
  const r = await buildQaAgent(m).generate({
    prompt: "Which company do the raters disagree about most, and why? Name the tools you called.",
  });
  return { data: r.text, usage: { input: r.usage?.inputTokens, output: r.usage?.outputTokens } };
});

console.log("\nok:", run.ok);
console.log("served by:", run.provider, run.model);
if (run.fellBackFrom?.length) {
  console.log("fell back from:");
  run.fellBackFrom.forEach((f) => console.log("   ✗", f.slice(0, 110)));
}
console.log("elapsed:", (run.ms / 1000).toFixed(1) + "s");
console.log("\n--- ANSWER ---\n" + (run.data ?? run.error));
