# ESG Ratings Aggregator & Divergence Analyser

Compare MSCI, Sustainalytics, LSEG and S&P Global ESG ratings side by side,
quantify how far they disagree, and see which methodology differences drive the
gap.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 104 tests
npm run coverage   # with coverage thresholds
npm run calibrate  # verify the dataset's correlation structure
npm run build
```

**Sign in with the demo credentials shown on the login screen** (click the dashed
box to fill them):

```
analyst@xyz-capital.com · esg2026
```

This sign-in is presentation only — see `src/lib/session.ts`. There is no account
system, no password hashing and no server-side verification, because nothing
behind it is private. It exists to frame the tool for its audience and to give
the demo a defined entry point.

---

## Findings

Divergence is usually reported as a score. This tool reports what it costs.

**Across four standard institutional mandates applied to the same 30 companies,
48% of holdings change eligibility depending on which vendor is licensed.** On a
top-quartile mandate two vendors' portfolios overlap by as little as 38% —
switching provider turns over most of the book for reasons unrelated to the
companies. Expressed the way a portfolio manager reads it, that is roughly
**20bp of one-off transaction cost** on the worst mandate against 2.8bp on the
best.

Three results support it:

**1. The disagreement is real, not noise.** Tested against a permutation null in
which each rater's scores are shuffled independently — destroying shared signal
while preserving each rater's own distribution. Independent raters would produce
mean divergence of 60.7 (95% 55.3–65.7); the observed 42.9 sits far below that,
p < 0.002 over 500 permutations. The raters do measure a shared construct. What
survives is the part that moves portfolios.

**2. It is predictable.** Three of four pre-stated hypotheses hold. Carbon
intensity is the strongest driver: high-carbon companies diverge 15.1 points
more than medium-carbon ones (Cohen's d 1.34, non-overlapping intervals),
because absolute and industry-relative benchmarks treat sector exposure in
opposite directions. Divergence concentrates exactly where methodology choices
have room to bite, which means it is forecastable from company characteristics
before any rating is consulted.

**3. Screen design matters more than vendor choice.** Rank-based exclusions
leave 27% of holdings contested; absolute score floors leave 63%. Raters
disagree about *levels* far more than about *ordering*. A mandate reading "score
of 50 or above" is inheriting its vendor's calibration; one reading "bottom
decile excluded" is not.

All figures carry bootstrap confidence intervals and survive a threshold
sensitivity sweep from the top 10% to the top 50%.

**Research and education tool. Not investment advice.**

---

## ⚠️ Data status — read this first

**Every rating in this build is a calibrated synthetic value, not a published
vendor score.** MSCI, Sustainalytics and LSEG ratings are proprietary and
licensed. There is no lawful automated route to them: no free API exists, Yahoo
Finance's ESG endpoint (the usual free proxy) was Sustainalytics-derived and has
been unreliable since ~2023, and the providers' terms prohibit scraping their
public lookup pages.

Rather than fabricate a pipeline that cannot exist, the values were constructed
in two documented, reproducible stages:

1. **Structure.** Written by hand to reproduce the divergence patterns the
   literature records — industry-relative raters scoring oil majors respectably,
   disclosure-weighted raters rewarding heavy reporters, absolute risk raters
   penalising high-exposure sectors.
2. **Calibration.** `scripts/calibrate.mts` injects deterministic idiosyncratic
   variance until all six pairwise rank correlations fall inside the 0.38–0.71
   range Berg, Kölbel & Rigobon (2022) report — subject to constraints that each
   rater's view of each *sector* is unchanged, no value moves more than 18
   points, and the named narrative cases do not flip.

The result is a dataset whose correlation **structure** matches the empirical
literature even though no individual value is a real rating. That makes it
suitable for demonstrating and testing the analytics, and **unsuitable for any
statement about a real company**. `npm run calibrate` reproduces the report, and
CI fails if a hand-edit drifts the structure out of range.

The methods transfer to real data unchanged; the specific numbers do not. To
swap in real figures, see `/methodology#provenance` in the running app — the
provider adapter interface means it is a data-source change, not a rewrite.

---

---

## Agent layer

Six agents at the edges of a deterministic core. They fetch, classify, narrate
and verify; they never do arithmetic. The maths stays in `src/lib/` and is
handed to them **as tools**, so a model can *call* `computeDivergence("TSLA")`
but can never *invent* the number.

| # | Agent | Role |
|---|---|---|
| 1 | Data Sourcing | Finds published ratings from open sources, with citations |
| 2 | Verifier | Independently re-fetches each citation and tries to knock it down |
| 3 | Controversy Analyst | Re-grades the controversy level driving the divergence rules |
| 4 | Narrative Analyst | Rewrites the drivers as prose. **Zero tools.** |
| 5 | Methodology Watcher | Detects drift between encoded and published methodologies |
| 6 | Research Q&A | Answers by calling the engine, with the tool trace shown |

Everything an agent produces is a **proposal**. Nothing reaches the dataset
without passing the Verifier and then a human.

### Model providers

Copy `.env.local.example` to `.env.local` and add at least one key. All three
recommended providers are free.

| Provider | Env var | Free tier | Role |
|---|---|---|---|
| **Groq** | `GROQ_API_KEY` | Free | **Primary.** Most dependable in testing |
| **Google Gemini** | `GOOGLE_GENERATIVE_AI_API_KEY` | Free, no card | Second. 1M context, but 503s under load |
| **Cerebras** | `CEREBRAS_API_KEY` | Free daily allowance | Third. Fastest, but runs out |
| Ollama | `OLLAMA_MODEL` | Free, local | Optional, offline. Last — too small for tool chains |

Runs walk the chain in order, so a rate limit falls through instead of ending
the session. Order was set from measured behaviour: Groq answered first time
while Gemini returned 503 through three retries, and Cerebras returned
"payment required" once its daily allowance was spent.

Two roles: **reasoning** (tool calling + structured output — agents 1, 2, 3, 5,
6) and **fast** (plain text, no tools — agent 4 only, so it gets the quickest
model rather than the strongest).

xAI's Grok is deliberately absent — it needs a card and covers nothing the
above does not.

```bash
npm test                 # 104 tests, including the agent tool layer
npm run check:providers  # live end-to-end run, shows the fallback chain
```

Without any key: agents 1-3, 5 and 6 return a clear 503; agent 4 falls back to
the deterministic rules-engine explanation, which is a complete answer rather
than a stub. Every non-agent feature works regardless.

---

## Architecture

```
src/lib/types.ts        Domain model. Every rating carries its own provenance.
src/lib/providers.ts    Phase 1 — methodology knowledge base (the intellectual core)
src/data/companies.ts   30 companies, 6 per sector, with explanation-driving attributes
src/data/ratings.ts     Seed dataset  ← replace this
src/lib/normalise.ts    Phase 3 — common scale, uncertainty bands, sector percentiles
src/lib/divergence.ts   Phase 4 — divergence metrics, Spearman, universe stats
src/lib/explain.ts      Phase 5 — deterministic rules engine
src/lib/validate.ts     Ingestion validator
```

Data flows one way: `providers + data → normalise → divergence → explain → UI`.
Nothing downstream writes back.

### Three decisions that carry the credibility

1. **Sustainalytics is inverted, not translated.** Its raw figure is unmanaged
   risk — lower is better. Mapped as `100 − (risk ÷ 50) × 100`. The practical
   maximum is 50, not the theoretical 100, because essentially no rated company
   exceeds 50 and normalising against 100 would squash every real company into
   the top half of the axis.

2. **MSCI letters are intervals, not points.** "AA" spans 7.143–8.570 on the
   underlying 0–10 score, so every MSCI value carries an uncertainty band equal
   to its bucket width, and the charts render it. Treating a letter grade as a
   point estimate manufactures precision that does not exist.

3. **Sector percentile is the honest view.** Comparing an industry-relative
   rating to an absolute one on a raw axis is apples-to-oranges by construction.

### Divergence score

```
score = max(normalisedRange, percentileRange)
```

The larger of the two, not an average. An earlier version averaged them and
produced a documented false negative: Meta is ranked last in technology by all
four providers (rank spread 0) while sitting 30 points apart on level — the
average scored that 15 and called it "Aligned". Each company page also reports
the **disagreement type** (level / rank / both), which is more useful than the
single number.

Bands: `0–15 Aligned · 16–35 Mild · 36–60 Significant · 61+ Extreme`

### Explanation engine

Deterministic. No model, no API call, no randomness. It diffs two providers'
structured methodology profiles, checks each difference against the company's own
attributes, and emits drivers attributed to **scope / measurement / weight** after
Berg, Kölbel & Rigobon (2022), *Aggregate Confusion: The Divergence of ESG
Ratings*, Review of Finance 26(6).

The roadmap adds an optional Claude narrative layer on top, constrained so it may
rephrase drivers but never compute a number or introduce a fact. Keeping
computation and narration strictly separated is what makes the output auditable.

---

## Export

Every screen has an **Export** menu, and individual cards have their own download
buttons so a single dataset can be pulled without taking everything.

| Format | Contents |
|---|---|
| PDF | `window.print()` against the `@media print` block in `globals.css` — no PDF library. `/report` is the print-optimised layout. |
| CSV | Divergence metrics · normalised scores · raw ratings · divergence drivers · methodology profiles · correlation matrix |
| JSON | The complete structured dataset |

Files are generated server-side (`/api/export`) so the serialisers and the full
dataset stay out of the client bundle. On a company page the exports scope to
that company automatically.

**Every export carries its provenance in the file header** — source, generation
date, the divergence formula, and the illustrative-data warning. A CSV that
escapes into a spreadsheet loses all of its on-screen context, so the context has
to travel with it. CSV writing also neutralises leading `=`, `+`, `-` and `@` so
values are not executed as formulas by Excel or Sheets.

## Design

Light mode only. Three levels of nesting — soft grey backdrop → rounded app shell
→ glass cards — which is what produces the depth; a flat page with cards on it
does not read the same way. Glass surfaces need something behind them to blur, so
the backdrop carries soft gradient blooms.

The divergence ramp (teal → amber → orange → rose) deliberately avoids red/green:
in a finance UI those already mean "down" and "up". It escalates in both hue and
luminance, so severity survives greyscale and colour-vision deficiency.

Type: Space Grotesk (display) · Inter (body) · JetBrains Mono (figures).

## Testing

```bash
npm test           # 104 tests across 6 files
npm run coverage   # 76% statements on the analytical core, 70% threshold
```

Unit tests cover normalisation, divergence, screening, statistics, predictors
and the agent tool layer. UI is verified by the production build and browser
checks rather than tests that would mostly assert their own markup back.

Several tests are explicit regression guards for bugs found during development
and documented in the code: the averaged divergence score that called a 30-point
gap "Aligned", the tool trace that read only the last agent step, the turnover
figure that exceeded 100%, the null model that compared unlike statistics, and
the group comparison that pitted n=1 against n=18.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests with coverage, the
data calibration check and the build on every push and pull request. The
calibration step fails the build if a hand-edit to the seed data drifts the
correlation structure outside the published range — that structure is what makes
the synthetic dataset defensible, and it should not be possible to break it
silently.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · zero chart
dependencies (hand-rolled SVG, because off-the-shelf chart components will not
render the uncertainty bands) · zero UI dependencies.

All 30 company pages prerender statically. `Shell` deliberately does not call
`cookies()` — doing so would opt every page out of static generation for the sake
of a display name, so `UserMenu` reads the session in the browser instead.

Sign-in and sign-out use full navigations rather than `router.push`. The guard
lives in `src/proxy.ts` (Next 16's renamed middleware convention), and a
client-side App Router navigation does not re-evaluate it against a cookie that
was only just written.

---

## Known limitations

Stated plainly, because a tool about transparency that hides its own weak points
would be self-defeating.

- **The ratings are synthetic.** Calibrated to the published correlation
  structure, but no individual value is a real vendor score. The method
  transfers; the numbers do not.
- **n = 30.** Group comparisons in the research section are underpowered by
  construction. Effect sizes and intervals are reported rather than p-values
  from a fitted model precisely because a four-predictor regression on thirty
  observations would produce coefficients nobody should believe.
- **Equal weighting in the screens.** The turnover figures apply market-cap
  weighting, but portfolio construction assumes equal position sizing.
- **The transaction-cost estimate is order-of-magnitude.** 10–25bp one-way is a
  reasonable large-cap assumption, not a transaction-cost model. Real cost
  depends on liquidity, urgency and implementation.
- **Sector percentiles are coarse.** Six companies per sector gives a 16.7-point
  step. The divergence rank component uses the 30-company universe instead
  (3.3-point step), but the sector view retains the limitation.
- **Causation is not established.** The engine identifies which methodology
  differences are *capable* of producing an observed gap. Without vendors'
  indicator-level data it cannot prove which one did.
- **Provider methodologies change.** The encoded profiles are a snapshot; the
  Methodology Watcher agent exists to catch drift, but it is not a substitute
  for periodic manual review.

**Research and education tool. Not investment advice.**
