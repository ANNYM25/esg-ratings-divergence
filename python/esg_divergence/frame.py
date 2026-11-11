"""pandas views of the analysis, for notebooks and ad-hoc research."""
from __future__ import annotations

import pandas as pd

from .data import PROVIDER_IDS, Dataset, dataset
from .divergence import universe
from .normalise import normalised_ratings_for


def ratings_frame(ds: Dataset | None = None) -> pd.DataFrame:
    """Long format: one row per (company, provider)."""
    ds = ds or dataset()
    rows = []
    for c in ds.companies:
        for r in normalised_ratings_for(c["ticker"], ds):
            rows.append({
                "ticker": c["ticker"], "name": c["name"], "sector": c["sector"], "provider": r.provider,
                "raw": r.raw, "label": r.label, "normalised": r.normalised,
                "band_low": r.band[0], "band_high": r.band[1],
                "sector_percentile": r.sector_percentile, "universe_percentile": r.universe_percentile,
            })
    return pd.DataFrame(rows)


def scores_wide(ds: Dataset | None = None, value: str = "normalised") -> pd.DataFrame:
    """Wide format: companies × providers."""
    df = ratings_frame(ds).pivot(index="ticker", columns="provider", values=value)
    return df[list(PROVIDER_IDS)]


def divergence_frame(ds: Dataset | None = None) -> pd.DataFrame:
    """One row per company: score, band, profile, ranges and the company attributes."""
    ds = ds or dataset()
    attrs = {c["ticker"]: c["attributes"] for c in ds.companies}
    caps = {c["ticker"]: c["marketCapUsdB"] for c in ds.companies}
    return pd.DataFrame([{
        "ticker": r.ticker, "name": r.name, "sector": r.sector, "score": r.divergence.score,
        "band": r.divergence.band, "profile": r.divergence.profile,
        "level_range": r.divergence.normalised_range, "rank_range": r.divergence.percentile_range,
        "consensus": r.consensus, "market_cap_usd_b": caps[r.ticker],
        "carbon": attrs[r.ticker]["carbonIntensity"], "disclosure": attrs[r.ticker]["disclosure"],
        "controversy": attrs[r.ticker]["controversy"], "product": attrs[r.ticker]["productAlignment"],
    } for r in universe(ds)]).set_index("ticker")
