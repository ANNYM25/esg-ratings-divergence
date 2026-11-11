# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] · 2026-11-11

### Added
- **Python research engine** (`python/esg_divergence`): normalisation, divergence, Spearman, bootstrap,
  permutation null, screening, turnover cost and predictor tests, with pandas views and a `rich` CLI
- **Cross-language parity**: `npm run export:data` writes `data/reference.json` from the TypeScript engine;
  42 pytest tests assert the Python port reproduces it exactly (seeded PRNG, JS rounding and summation included)
- `data/ratings.csv` and JSON exports of the full dataset
- Executed research notebook (`python/notebooks/divergence_walkthrough.ipynb`)
- Seven publication figures (`docs/figures`) and full-app screenshots (`docs/screenshots`), both regenerable from Python
- Python job in CI; CI also fails if `data/` drifts from the TypeScript source

### Changed
- README rebuilt around the findings, with figures, screenshots and the Python engine
- Neutral wording for the optional LLM narrative layer

## [0.2.0]

### Added
- **CI pipeline** (`.github/workflows/ci.yml`) — typecheck, lint, tests with
  coverage, the dataset calibration check, and the production build on every push
  and pull request. (The README described this; now it actually exists.)
- **Secret scanning** (`.github/workflows/gitleaks.yml` + `.gitleaks.toml`) and a
  `SECURITY.md` policy.
- `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `.gitattributes`, and GitHub
  issue templates.
- README hero with status badges and a Mermaid architecture diagram (data flow +
  agent layer).

## [0.1.0]

### Added
- The ESG divergence analyser: compare MSCI, Sustainalytics, LSEG and S&P Global
  ratings, quantify disagreement, and attribute it to methodology differences.
- Deterministic analytical core (`src/lib`), a six-agent layer over it, static
  prerendering of all company pages, and PDF/CSV/JSON export with provenance.
- Calibrated synthetic dataset matching the Berg–Kölbel–Rigobon (2022) correlation
  structure; 104 tests.
