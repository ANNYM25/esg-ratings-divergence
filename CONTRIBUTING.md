# Contributing

Thanks for improving the ESG divergence analyser.

## Getting set up

```bash
npm install
cp .env.local.example .env.local   # add at least one free model key for the agents
npm run dev                        # http://localhost:3000
```

## Before you open a pull request

Run the same checks CI runs — all must pass:

```bash
npm run lint           # eslint
npx tsc --noEmit       # typecheck
npm run coverage       # tests + coverage thresholds
npm run calibrate      # dataset correlation structure stays in range
npm run build          # production build
```

## Ground rules

- **Never commit secrets.** Keys go in `.env.local` only (git-ignored). gitleaks
  will fail the build if one slips in.
- **The data is synthetic and calibrated.** If you edit the seed ratings,
  `npm run calibrate` must still pass — that structure is what makes the dataset
  defensible. Don't bypass it.
- **Keep computation and narration separate.** The `src/lib` core does the maths;
  agents may only *call* it as tools, never invent numbers.
- Add a regression test when you fix a bug (see the existing guards in
  `src/lib/*.test.ts`).

## Commit messages

Write why, not a file list — e.g. `fix turnover figure exceeding 100% on top-decile mandate`.
