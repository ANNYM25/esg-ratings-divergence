"""
Screening impact: what divergence *costs* a portfolio. Port of src/lib/screening.ts.

Four standard institutional mandates are applied to the same universe under each vendor.
A holding is *contested* when vendors disagree about its eligibility.
"""
from __future__ import annotations

from dataclasses import dataclass

from ._compat import js_round, js_sum
from .data import PROVIDER_IDS, Dataset, dataset
from .normalise import normalised_ratings_for

SCREENS = {
    "top_quartile": "Top-quartile inclusion",
    "exclude_bottom_decile": "Bottom-decile exclusion",
    "absolute_threshold": "Absolute score floor",
    "best_in_class": "Best-in-class by sector",
}

COST_BP = {"low": 10.0, "mid": 17.5, "high": 25.0}  # one-way, large-cap developed-market equity


def passes(screen: str, ticker: str, provider: str, ds: Dataset | None = None) -> bool | None:
    rating = next((r for r in normalised_ratings_for(ticker, ds) if r.provider == provider), None)
    if rating is None:
        return None
    return {
        "top_quartile": rating.universe_percentile >= 75,
        "exclude_bottom_decile": rating.universe_percentile > 10,
        "absolute_threshold": rating.normalised >= 50,
        "best_in_class": rating.sector_percentile >= 50,
    }[screen]


@dataclass(frozen=True)
class CompanyScreen:
    ticker: str
    sector: str
    by_provider: dict[str, bool | None]

    @property
    def included_by(self) -> list[str]:
        return [p for p in PROVIDER_IDS if self.by_provider[p] is True]

    @property
    def excluded_by(self) -> list[str]:
        return [p for p in PROVIDER_IDS if self.by_provider[p] is False]

    @property
    def contested(self) -> bool:
        return bool(self.included_by) and bool(self.excluded_by)


@dataclass(frozen=True)
class ScreenImpact:
    screen: str
    companies: list[CompanyScreen]

    def holdings(self, provider: str) -> list[str]:
        return [c.ticker for c in self.companies if c.by_provider[provider] is True]

    @property
    def contested(self) -> list[CompanyScreen]:
        # most balanced splits first: a 2–2 split is more interesting than 3–1
        rows = [c for c in self.companies if c.contested]
        return sorted(rows, key=lambda c: abs(len(c.included_by) * 2 - (len(c.included_by) + len(c.excluded_by))))

    @property
    def contested_share(self) -> float:
        return js_round(len(self.contested) / len(self.companies) * 100, 0)

    @property
    def portfolio_size(self) -> dict[str, int]:
        return {p: len(self.holdings(p)) for p in PROVIDER_IDS}

    @property
    def min_overlap(self) -> dict:
        """Worst pairwise overlap, as a share of the larger portfolio."""
        worst = {"a": PROVIDER_IDS[0], "b": PROVIDER_IDS[1], "overlap": 1.0}
        for i, a in enumerate(PROVIDER_IDS):
            for b in PROVIDER_IDS[i + 1:]:
                ha, hb = self.holdings(a), self.holdings(b)
                denom = max(len(ha), len(hb))
                overlap = 1.0 if denom == 0 else sum(1 for t in ha if t in hb) / denom
                if overlap < worst["overlap"]:
                    worst = {"a": a, "b": b, "overlap": overlap}
        return {**worst, "overlap": js_round(worst["overlap"] * 100, 0)}

    def summary(self) -> dict:
        decided = [c for c in self.companies if c.included_by or c.excluded_by]
        return {
            "id": self.screen,
            "contestedCount": len(self.contested),
            "contestedShare": self.contested_share,
            "portfolioSizeByProvider": self.portfolio_size,
            "unanimousInclude": sum(1 for c in decided if not c.excluded_by),
            "unanimousExclude": sum(1 for c in decided if not c.included_by),
            "minOverlap": self.min_overlap,
            "contested": [c.ticker for c in self.contested],
        }


def analyse_screen(screen: str, ds: Dataset | None = None) -> ScreenImpact:
    ds = ds or dataset()
    return ScreenImpact(screen, [
        CompanyScreen(c["ticker"], c["sector"], {p: passes(screen, c["ticker"], p, ds) for p in PROVIDER_IDS})
        for c in ds.companies
    ])


def analyse_all_screens(ds: Dataset | None = None) -> list[ScreenImpact]:
    return [analyse_screen(s, ds) for s in SCREENS]


def screening_headline(ds: Dataset | None = None) -> dict:
    ds = ds or dataset()
    impacts = analyse_all_screens(ds)
    by_share = sorted(impacts, key=lambda s: -s.contested_share)
    contested_sets = [{c.ticker for c in s.contested} for s in impacts]

    worst = impacts[0]
    for s in impacts[1:]:
        if s.min_overlap["overlap"] < worst.min_overlap["overlap"]:
            worst = s
    return {
        "meanContestedShare": js_round(js_sum(s.contested_share for s in impacts) / len(impacts), 0),
        "everContested": len(set().union(*contested_sets)),
        "alwaysContested": [t for t in ds.tickers if all(t in s for s in contested_sets)],
        "worstOverlap": {"screen": SCREENS[worst.screen], **worst.min_overlap},
        "worst": by_share[0].screen,
        "best": by_share[-1].screen,
    }


def turnover_for_screen(screen: str, ds: Dataset | None = None) -> dict:
    """Worst-case one-off cost of switching ESG vendor under this mandate, in bp of portfolio value."""
    ds = ds or dataset()
    impact = analyse_screen(screen, ds)
    cap = {c["ticker"]: c["marketCapUsdB"] for c in ds.companies}
    worst = None
    for i, a in enumerate(PROVIDER_IDS):
        for b in PROVIDER_IDS[i + 1:]:
            in_a, in_b = impact.holdings(a), impact.holdings(b)
            if not in_a or not in_b:
                continue
            sold = [t for t in in_a if t not in in_b]
            bought = [t for t in in_b if t not in in_a]
            sold_w = js_sum(cap[t] for t in sold) / js_sum(cap[t] for t in in_a)
            bought_w = js_sum(cap[t] for t in bought) / js_sum(cap[t] for t in in_b)
            value = (sold_w + bought_w) / 2
            candidate = {
                "screen": screen, "a": a, "b": b,
                "nameTurnover": js_round(len(sold) / len(in_a) * 100, 0),
                "valueTurnover": js_round(value * 100, 0),
                # a sell leg and a buy leg, hence 2× the one-way rate
                "costBpLow": js_round(value * 2 * COST_BP["low"], 1),
                "costBpMid": js_round(value * 2 * COST_BP["mid"], 1),
                "costBpHigh": js_round(value * 2 * COST_BP["high"], 1),
            }
            if worst is None or candidate["valueTurnover"] > worst["valueTurnover"]:
                worst = candidate
    return worst or {"screen": screen, "a": PROVIDER_IDS[0], "b": PROVIDER_IDS[1], "nameTurnover": 0,
                     "valueTurnover": 0, "costBpLow": 0, "costBpMid": 0, "costBpHigh": 0}


def turnover_across_screens(ds: Dataset | None = None) -> list[dict]:
    return sorted((turnover_for_screen(s, ds) for s in SCREENS), key=lambda t: -t["valueTurnover"])
