"""
Is divergence predictable from company characteristics? Port of src/lib/predictors.ts.

Four hypotheses are stated before looking at the numbers; each is judged on whether the
group expected to diverge most actually does, with bootstrap intervals and Cohen's d.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from ._compat import js_round, mean
from .data import Dataset, dataset
from .divergence import compute_divergence
from .statistics import Interval, bootstrap, stdev

MIN_GROUP_N = 3

HYPOTHESES = [
    # id, attribute key, ordered (value, label) buckets, label expected to diverge most
    ("disclosure", "disclosure",
     [("low", "Low disclosure"), ("medium", "Medium disclosure"), ("high", "High disclosure")], "Low disclosure"),
    ("product", "productAlignment",
     [("negative", "Product harms"), ("positive", "Product helps"), ("neutral", "Product neutral")], "Product harms"),
    ("controversy", "controversy",
     [("severe", "Severe"), ("significant", "Significant"), ("moderate", "Moderate"), ("none", "None")], "Severe"),
    ("carbon", "carbonIntensity",
     [("high", "High carbon"), ("medium", "Medium carbon"), ("low", "Low carbon")], "High carbon"),
]


@dataclass(frozen=True)
class Group:
    label: str
    tickers: list[str]
    scores: list[float]
    interval: Interval

    @property
    def n(self) -> int:
        return len(self.tickers)

    @property
    def underpowered(self) -> bool:
        return self.n < MIN_GROUP_N


@dataclass(frozen=True)
class PredictorResult:
    id: str
    groups: list[Group]
    spread: float
    effect_size: float
    effect_label: str
    separated: bool
    supported: bool
    compared_groups: tuple[str, str]


def cohens_d(a: list[float], b: list[float]) -> float:
    if len(a) < 2 or len(b) < 2:
        return 0.0
    pooled = math.sqrt(((len(a) - 1) * stdev(a) ** 2 + (len(b) - 1) * stdev(b) ** 2) / (len(a) + len(b) - 2))
    return 0.0 if pooled == 0 else (mean(a) - mean(b)) / pooled


def effect_label(d: float) -> str:
    d = abs(d)
    return "negligible" if d < 0.2 else "small" if d < 0.5 else "medium" if d < 0.8 else "large"


def _analyse(pid: str, attribute: str, buckets: list[tuple[str, str]], expected: str, ds: Dataset) -> PredictorResult:
    groups = []
    for value, label in buckets:
        members = [c["ticker"] for c in ds.companies if c["attributes"][attribute] == value]
        if members:
            scores = [compute_divergence(t, ds).score for t in members]
            groups.append(Group(label, members, scores, bootstrap(scores)))

    usable = [g for g in groups if not g.underpowered]
    ranked = sorted(usable if len(usable) >= 2 else groups, key=lambda g: -g.interval.estimate)
    top, bottom = ranked[0], ranked[-1]
    d = cohens_d(top.scores, bottom.scores)
    by_mean = sorted(groups, key=lambda g: -g.interval.estimate)  # hypothesis judged on ALL groups
    return PredictorResult(
        id=pid,
        groups=groups,
        spread=js_round(top.interval.estimate - bottom.interval.estimate, 1),
        effect_size=js_round(d, 2),
        effect_label=effect_label(d),
        separated=top.interval.low > bottom.interval.high or bottom.interval.low > top.interval.high,
        supported=by_mean[0].label == expected,
        compared_groups=(top.label, bottom.label),
    )


def analyse_predictors(ds: Dataset | None = None) -> list[PredictorResult]:
    ds = ds or dataset()
    return [_analyse(pid, attr, buckets, expected, ds) for pid, attr, buckets, expected in HYPOTHESES]


def strongest(results: list[PredictorResult]) -> PredictorResult:
    """Largest effect, preferring results whose intervals actually separate."""
    return sorted(results, key=lambda r: (not r.separated, -abs(r.effect_size)))[0]
