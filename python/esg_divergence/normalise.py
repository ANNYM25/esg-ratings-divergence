"""
Normalisation: four incommensurable provider scales → one 0–100 axis where higher is better.

Port of src/lib/normalise.ts. The three decisions that carry the analysis:

1. Sustainalytics is *inverted*, not translated: ``100 − risk / practicalMax × 100``,
   with a practical maximum of 50 because virtually no rated company exceeds it.
2. MSCI letters are *intervals*: every MSCI value carries the full width of its bucket
   as an uncertainty band.
3. Sector percentile is the honest common ground; the normalised level is the weaker view.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from ._compat import js_round
from .data import PILLARS, PROVIDER_IDS, Dataset, dataset


def clamp(value: float, lo: float = 0, hi: float = 100) -> float:
    return min(hi, max(lo, value))


def bucket_for(provider: str, raw: float, ds: Dataset | None = None) -> dict | None:
    buckets = (ds or dataset()).providers[provider]["scale"].get("buckets")
    if not buckets:
        return None
    return next((b for b in buckets if b["min"] <= raw <= b["max"]), None)


def to_common_scale(provider: str, raw: float, ds: Dataset | None = None) -> float:
    scale = (ds or dataset()).providers[provider]["scale"]
    ceiling = scale.get("practicalMax", scale["max"])
    span = ceiling - scale["min"]
    if span <= 0:
        return 0.0
    position = (clamp(raw, scale["min"], ceiling) - scale["min"]) / span
    oriented = 1 - position if scale["direction"] == "lower_better" else position
    return js_round(clamp(oriented * 100), 1)


def uncertainty_band(provider: str, raw: float, ds: Dataset | None = None) -> tuple[float, float]:
    """Bucketed scales inherit the bucket width; continuous scales get ±2.5 for rounding."""
    bucket = bucket_for(provider, raw, ds)
    if bucket:
        a, b = to_common_scale(provider, bucket["min"], ds), to_common_scale(provider, bucket["max"], ds)
        return js_round(min(a, b), 1), js_round(max(a, b), 1)
    point = to_common_scale(provider, raw, ds)
    return js_round(clamp(point - 2.5), 1), js_round(clamp(point + 2.5), 1)


def native_label(provider: str, raw: float, ds: Dataset | None = None) -> str:
    bucket = bucket_for(provider, raw, ds)
    if provider == "msci":
        return bucket["label"] if bucket else f"{raw:.1f}"
    if provider == "sustainalytics":
        return f"{raw:.1f}" + (f" · {bucket['label']}" if bucket else "")
    if provider == "lseg":
        return f"{js_round(raw, 0):.0f}" + (f" · {bucket['label']}" if bucket else "")
    return f"{js_round(raw, 0):.0f}/{(ds or dataset()).providers[provider]['scale']['max']}"


def _midpoint_percentiles(scored: list[tuple[str, float]]) -> dict[str, float]:
    """Fractional ranking: ties share a rank instead of one arbitrarily winning."""
    n = len(scored)
    out = {}
    for ticker, value in scored:
        below = sum(1 for _, o in scored if o < value)
        equal = sum(1 for _, o in scored if o == value)
        out[ticker] = js_round((below + equal / 2) / n * 100, 1)
    return out


@lru_cache(maxsize=8)
def _percentile_indexes(ds: Dataset) -> tuple[dict, dict]:
    sector_idx: dict[tuple[str, str], float] = {}
    universe_idx: dict[tuple[str, str], float] = {}
    sectors = list(dict.fromkeys(c["sector"] for c in ds.companies))
    for sector in sectors:
        members = {c["ticker"] for c in ds.companies if c["sector"] == sector}
        for p in PROVIDER_IDS:
            scored = [(r["ticker"], to_common_scale(p, r["rawScore"], ds))
                      for r in ds.ratings if r["provider"] == p and r["ticker"] in members]
            for t, pct in _midpoint_percentiles(scored).items():
                sector_idx[(t, p)] = pct
    for p in PROVIDER_IDS:
        scored = [(r["ticker"], to_common_scale(p, r["rawScore"], ds)) for r in ds.ratings if r["provider"] == p]
        for t, pct in _midpoint_percentiles(scored).items():
            universe_idx[(t, p)] = pct
    return sector_idx, universe_idx


def sector_percentile(ticker: str, provider: str, ds: Dataset | None = None) -> float:
    return _percentile_indexes(ds or dataset())[0].get((ticker.upper(), provider), 0.0)


def universe_percentile(ticker: str, provider: str, ds: Dataset | None = None) -> float:
    return _percentile_indexes(ds or dataset())[1].get((ticker.upper(), provider), 0.0)


@dataclass(frozen=True)
class NormalisedRating:
    ticker: str
    provider: str
    raw: float
    label: str
    normalised: float
    band: tuple[float, float]
    sector_percentile: float
    universe_percentile: float
    pillars: dict[str, float] | None
    provenance: str
    as_of: str


def normalise_record(record: dict, ds: Dataset | None = None) -> NormalisedRating:
    ds = ds or dataset()
    p, raw = record["provider"], record["rawScore"]
    pillars = record.get("pillars")
    return NormalisedRating(
        ticker=record["ticker"],
        provider=p,
        raw=raw,
        label=native_label(p, raw, ds),
        normalised=to_common_scale(p, raw, ds),
        band=uncertainty_band(p, raw, ds),
        sector_percentile=sector_percentile(record["ticker"], p, ds),
        universe_percentile=universe_percentile(record["ticker"], p, ds),
        pillars={k: to_common_scale(p, pillars[k], ds) for k in PILLARS} if pillars else None,
        provenance=record["provenance"],
        as_of=record["asOf"],
    )


def normalised_ratings_for(ticker: str, ds: Dataset | None = None) -> list[NormalisedRating]:
    """Every rating for one company in provider order. Missing providers are absent, never zero-filled."""
    ds = ds or dataset()
    rows = [normalise_record(r, ds) for r in ds.ratings if r["ticker"] == ticker.upper()]
    return sorted(rows, key=lambda r: PROVIDER_IDS.index(r.provider))
