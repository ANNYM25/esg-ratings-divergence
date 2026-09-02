import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Native tsconfig path resolution — no plugin needed.
    tsconfigPaths: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      // The analytical core is what must be covered. UI components are verified
      // by the production build and browser checks, not by unit tests that
      // would mostly assert their own markup back at them.
      include: ["src/lib/**/*.ts", "src/agents/tools.ts"],
      exclude: ["src/lib/ui.ts", "src/lib/**/*.test.ts"],
      reporter: ["text-summary"],
      thresholds: { lines: 70, functions: 70, statements: 70 },
    },
  },
});
