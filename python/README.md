# esg-divergence · Python research engine

The analytics behind the ESG Ratings Divergence app, in Python, verified to match the TypeScript engine exactly.

```bash
pip install -e ".[dev]"
python -m esg_divergence              # headline findings
python -m esg_divergence company XOM  # one company across four raters
python -m esg_divergence.figures      # regenerate docs/figures/*.png
pytest                                # unit + parity tests
```

| Module | What it does |
|---|---|
| `normalise` | Four native scales onto one 0–100 axis; bucket uncertainty bands; sector and universe percentiles |
| `divergence` | `max(level spread, rank spread)` score, bands, disagreement profiles, Spearman matrix |
| `statistics` | Seeded bootstrap intervals, permutation null, threshold sensitivity |
| `screening` | Four institutional mandates × four vendors: contested holdings, overlap, switching cost |
| `predictors` | Pre-stated hypotheses tested with bootstrap CIs and Cohen's d |
| `frame` | pandas views: long ratings, wide scores, per-company divergence with attributes |
| `figures` | matplotlib figures used in the README and the notebook |

The dataset lives in `../data`, exported from the TypeScript source by `npm run export:data`. Point `ESG_DATA_DIR`
at another directory with the same JSON shape to run the engine on your own ratings.

See the [project README](../README.md) for the findings and the data-status caveat: every rating is calibrated synthetic data.
