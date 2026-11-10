"""
Statistical inference: bootstrap intervals, a permutation null and threshold sensitivity.
Port of src/lib/statistics.ts, seeded identically so every interval and p-value matches.

A finding without an error bar is an anecdote.
"""
from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import asdict, dataclass

from ._compat import js_round, js_sum, make_rng, mean
from .data import PROVIDER_IDS, Dataset, dataset
from .divergence import spearman_raw, universe
from .normalise import to_common_scale

SEED = 20260822
DEFAULT_ITERATIONS = 2000


def stdev(xs: list[float]) -> float:
    """Sample standard deviation (n − 1)."""
    if len(xs) < 2:
        return 0.0
    m = mean(xs)
    return math.sqrt(js_sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def percentile_of(sorted_values: list[float], p: float) -> float:
    if not sorted_values:
        return 0.0
    idx = (len(sorted_values) - 1) * p
    lo, hi = math.floor(idx), math.ceil(idx)
    if lo == hi:
        return sorted_values[lo]
    return sorted_values[lo] + (sorted_values[hi] - sorted_values[lo]) * (idx - lo)


@dataclass(frozen=True)
class Interval:
    estimate: float
    low: float
    high: float
    margin: float
    iterations: int

    def __str__(self) -> str:
        return f"{self.estimate} (95% CI {self.low}–{self.high})"


def bootstrap(values: list[float], statistic: Callable[[list[float]], float] = mean,
              iterations: int = DEFAULT_ITERATIONS, seed: int = SEED) -> Interval:
    """Non-parametric bootstrap: divergence scores are bounded and skewed, so no normal approximation."""
    rng = make_rng(seed)
    n = len(values)
    draws = sorted(statistic([values[math.floor(rng() * n)] for _ in range(n)]) for _ in range(iterations))
    low, high = percentile_of(draws, 0.025), percentile_of(draws, 0.975)
    return Interval(js_round(statistic(values), 1), js_round(low, 1), js_round(high, 1),
                    js_round((high - low) / 2, 1), iterations)


@dataclass(frozen=True)
class NullTest:
    observed: float
    null_mean: float
    null_low: float
    null_high: float
    p_value: float
    iterations: int

    @property
    def significant(self) -> bool:
        return self.observed < self.null_low


def _fractional_percentiles(values: list[float | None]) -> list[float | None]:
    present = [v for v in values if v is not None]
    return [None if v is None else
            (sum(1 for o in present if o < v) + sum(1 for o in present if o == v) / 2) / len(present) * 100
            for v in values]


def permutation_draws(iterations: int = 500, seed: int = SEED, ds: Dataset | None = None) -> tuple[float, list[float]]:
    """
    Shuffle each provider's scores independently across companies: shared signal is destroyed,
    each rater's own distribution is preserved. Then recompute the *same* statistic as observed.
    Returns the observed mean divergence and the sorted null draws.
    """
    ds = ds or dataset()
    rng = make_rng(seed)
    by_provider = {
        p: [to_common_scale(p, r["rawScore"], ds) if (r := ds.rating(t, p)) else None for t in ds.tickers]
        for p in PROVIDER_IDS
    }
    observed = mean([r.divergence.score for r in universe(ds)])

    draws = []
    for _ in range(iterations):
        shuffled = {}
        for p in PROVIDER_IDS:
            arr = list(by_provider[p])
            for i in range(len(arr) - 1, 0, -1):  # Fisher–Yates, same draw order as the TS engine
                j = math.floor(rng() * (i + 1))
                arr[i], arr[j] = arr[j], arr[i]
            shuffled[p] = arr
        pct = {p: _fractional_percentiles(shuffled[p]) for p in PROVIDER_IDS}

        scores = []
        for i in range(len(ds.tickers)):
            levels = [shuffled[p][i] for p in PROVIDER_IDS if shuffled[p][i] is not None]
            ranks = [pct[p][i] for p in PROVIDER_IDS if pct[p][i] is not None]
            if len(levels) >= 2:
                scores.append(max(max(levels) - min(levels), max(ranks) - min(ranks)))
        draws.append(mean(scores))
    return observed, sorted(draws)


def permutation_null(iterations: int = 500, seed: int = SEED, ds: Dataset | None = None) -> NullTest:
    """Is the observed agreement more than four unrelated raters would produce by chance?"""
    observed, draws = permutation_draws(iterations, seed, ds)
    as_low = sum(1 for d in draws if d <= observed)  # one-sided: is the null ever this agreeable?
    return NullTest(js_round(observed, 1), js_round(mean(draws), 1), js_round(percentile_of(draws, 0.025), 1),
                    js_round(percentile_of(draws, 0.975), 1), js_round(as_low / len(draws), 4), iterations)


def threshold_sensitivity(start: int = 10, stop: int = 50, step: int = 5,
                          ds: Dataset | None = None) -> list[dict]:
    """Share of the universe whose top-X% eligibility depends on the vendor, for each X."""
    ds = ds or dataset()
    n = len(ds.companies)
    common = {(r["ticker"], r["provider"]): to_common_scale(r["provider"], r["rawScore"], ds) for r in ds.ratings}
    out = []
    for cutoff in range(start, stop + 1, step):
        keep_above = 100 - cutoff
        contested = 0
        for t in ds.tickers:
            verdicts = []
            for p in PROVIDER_IDS:
                if (t, p) not in common:
                    continue
                below = sum(1 for (_, q), v in common.items() if q == p and v < common[(t, p)])
                verdicts.append(below / n * 100 >= keep_above)
            if any(verdicts) and not all(verdicts):
                contested += 1
        out.append({"threshold": cutoff, "contestedShare": js_round(contested / n * 100, 0)})
    return out


def inference_summary(ds: Dataset | None = None) -> dict:
    ds = ds or dataset()
    rows = universe(ds)
    sensitivity = threshold_sensitivity(ds=ds)
    shares = [s["contestedShare"] for s in sensitivity]

    rhos = []
    for i, a in enumerate(PROVIDER_IDS):
        for b in PROVIDER_IDS[i + 1:]:
            pairs = [(common_a, common_b) for t in ds.tickers
                     if (ra := ds.rating(t, a)) and (rb := ds.rating(t, b))
                     for common_a, common_b in [(to_common_scale(a, ra["rawScore"], ds),
                                                 to_common_scale(b, rb["rawScore"], ds))]]
            rhos.append(spearman_raw([x for x, _ in pairs], [y for _, y in pairs]))

    return {
        "meanDivergence": asdict(bootstrap([r.divergence.score for r in rows])),
        "levelSpread": asdict(bootstrap([r.divergence.normalised_range for r in rows])),
        "rankSpread": asdict(bootstrap([r.divergence.percentile_range for r in rows])),
        "nullTest": asdict(permutation_null(ds=ds)),
        "sensitivity": sensitivity,
        "sensitivityRange": {"min": min(shares), "max": max(shares)},
        "correlationInterval": asdict(bootstrap(rhos, mean, 2000)),
        "sampleSize": len(rows),
    }
