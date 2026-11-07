# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
