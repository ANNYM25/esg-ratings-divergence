"""
Divergence metrics. Port of src/lib/divergence.ts. The formula is published, not hidden:

    normalised_range = max(normalised) − min(normalised)
    percentile_range = max(universe percentile) − min(universe percentile)
    score            = max(normalised_range, percentile_range)

Max rather than an average: Meta is ranked last in technology by every provider (rank range 0)
while the providers sit 30 points apart on level. An average called that "Aligned".
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from functools import lru_cache

from ._compat import js_round, js_sum, mean
from .data import PILLARS, PROVIDER_IDS, Dataset, dataset
from .normalise import NormalisedRating, normalised_ratings_for

BANDS = {  # label, inclusive upper bound
    "aligned": ("Aligned", 15),
    "mild": ("Mild", 35),
    "significant": ("Significant", 60),
    "extreme": ("Extreme", 100),
}
MATERIAL = 20  # a 20-point gap on either axis is a material disagreement


def band_for(score: float) -> str:
    for band, (_, upper) in BANDS.items():
        if score <= upper:
            return band
    return "extreme"


def profile_for(normalised_range: float, percentile_range: float) -> str:
    level, rank = normalised_range >= MATERIAL, percentile_range >= MATERIAL
    return "both" if level and rank else "level" if level else "rank" if rank else "none"


def _range(values: list[float]) -> float:
    return max(values) - min(values) if len(values) >= 2 else 0.0


def _pop_std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return math.sqrt(js_sum((v - m) ** 2 for v in values) / len(values))


@dataclass(frozen=True)
class PairwiseDelta:
    a: str
    b: str
    normalised_delta: float
    percentile_delta: float


@dataclass(frozen=True)
class DivergenceResult:
    ticker: str
    score: float
    band: str
    profile: str
    normalised_range: float
    percentile_range: float
    std_dev: float
    pairs: list[PairwiseDelta]
    highest: tuple[str, float] | None
    lowest: tuple[str, float] | None
    pillar_ranges: dict[str, float] = field(default_factory=dict)
    provider_count: int = 0

    @property
    def widest_pair(self) -> PairwiseDelta | None:
        return self.pairs[0] if self.pairs else None


def _pairwise(ratings: list[NormalisedRating]) -> list[PairwiseDelta]:
    out = [
        PairwiseDelta(a.provider, b.provider, js_round(abs(a.normalised - b.normalised), 1),
                      js_round(abs(a.universe_percentile - b.universe_percentile), 1))
        for i, a in enumerate(ratings) for b in ratings[i + 1:]
    ]
    return sorted(out, key=lambda d: -d.normalised_delta)


def compute_divergence(ticker: str, ds: Dataset | None = None) -> DivergenceResult:
    ratings = normalised_ratings_for(ticker, ds)
    levels = [r.normalised for r in ratings]
    ranks = [r.universe_percentile for r in ratings]  # universe, not sector: 3.3-pt steps vs 16.7

    normalised_range = js_round(_range(levels), 1)
    percentile_range = js_round(_range(ranks), 1)
    score = js_round(min(100, max(normalised_range, percentile_range)), 1)

    pillar_ranges = {}
    for pillar in PILLARS:
        values = [r.pillars[pillar] for r in ratings if r.pillars]
        if len(values) >= 2:
            pillar_ranges[pillar] = js_round(_range(values), 1)

    by_level = sorted(ratings, key=lambda r: -r.normalised)
    return DivergenceResult(
        ticker=ticker.upper(),
        score=score,
        band=band_for(score),
        profile=profile_for(normalised_range, percentile_range),
        normalised_range=normalised_range,
        percentile_range=percentile_range,
        std_dev=js_round(_pop_std(levels), 1),
        pairs=_pairwise(ratings),
        highest=(by_level[0].provider, by_level[0].normalised) if by_level else None,
        lowest=(by_level[-1].provider, by_level[-1].normalised) if by_level else None,
        pillar_ranges=pillar_ranges,
        provider_count=len(ratings),
    )


@dataclass(frozen=True)
class UniverseRow:
    ticker: str
    name: str
    sector: str
    divergence: DivergenceResult
    consensus: float


@lru_cache(maxsize=8)
def _universe(ds: Dataset) -> tuple[UniverseRow, ...]:
    rows = []
    for c in ds.companies:
        ratings = normalised_ratings_for(c["ticker"], ds)
        consensus = js_round(mean([r.normalised for r in ratings]), 1) if ratings else 0.0
        rows.append(UniverseRow(c["ticker"], c["name"], c["sector"], compute_divergence(c["ticker"], ds), consensus))
    return tuple(sorted(rows, key=lambda r: -r.divergence.score))


def universe(ds: Dataset | None = None) -> list[UniverseRow]:
    """Every company with its divergence, most divergent first."""
    return list(_universe(ds or dataset()))


def _ranks(values: list[float]) -> list[float]:
    """Average ranks for ties (1-based), as Spearman requires."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return ranks


def spearman_raw(xs: list[float], ys: list[float]) -> float:
    ra, rb = _ranks(xs), _ranks(ys)
    ma, mb = mean(ra), mean(rb)
    num = js_sum((a - ma) * (b - mb) for a, b in zip(ra, rb, strict=True))
    den = math.sqrt(js_sum((a - ma) ** 2 for a in ra) * js_sum((b - mb) ** 2 for b in rb))
    return 0.0 if den == 0 else num / den


def _paired(a: str, b: str, ds: Dataset) -> tuple[list[float], list[float]]:
    xs, ys = [], []
    for c in ds.companies:
        ratings = {r.provider: r.normalised for r in normalised_ratings_for(c["ticker"], ds)}
        if a in ratings and b in ratings:
            xs.append(ratings[a])
            ys.append(ratings[b])
    return xs, ys


def spearman(a: str, b: str, ds: Dataset | None = None) -> float:
    """Rank correlation between two providers across the universe (2 dp)."""
    xs, ys = _paired(a, b, ds or dataset())
    return 0.0 if len(xs) < 3 else js_round(spearman_raw(xs, ys), 2)


def correlation_matrix(ds: Dataset | None = None) -> dict[str, float]:
    return {f"{a}:{b}": 1 if a == b else spearman(a, b, ds) for a in PROVIDER_IDS for b in PROVIDER_IDS}


def sector_divergence(ds: Dataset | None = None) -> list[dict]:
    rows = universe(ds)
    out = []
    for sector in dict.fromkeys(r.sector for r in rows):
        scores = [r.divergence.score for r in rows if r.sector == sector]
        out.append({"sector": sector, "mean": js_round(mean(scores), 1), "max": js_round(max(scores), 1),
                    "count": len(scores)})
    return sorted(out, key=lambda s: -s["mean"])


def universe_stats(ds: Dataset | None = None) -> dict:
    rows = universe(ds)
    scores = [r.divergence.score for r in rows]
    counts = dict.fromkeys(BANDS, 0)
    for r in rows:
        counts[r.divergence.band] += 1
    return {
        "companies": len(rows),
        "providers": len(PROVIDER_IDS),
        "meanDivergence": js_round(mean(scores), 1),
        "maxDivergence": js_round(max(scores), 1),
        "counts": counts,
        "materialShare": js_round((counts["significant"] + counts["extreme"]) / len(rows) * 100, 0),
        "mostDivergent": rows[0].ticker,
    }
