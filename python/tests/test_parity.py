"""
Cross-language parity: the Python engine must reproduce the TypeScript engine exactly.

data/reference.json is generated from src/lib by `npm run export:data`. If either
implementation changes a formula without the other, these tests fail.
"""
import json
from dataclasses import asdict
from pathlib import Path

import pytest

from esg_divergence import (
    analyse_all_screens,
    analyse_predictors,
    correlation_matrix,
    inference_summary,
    screening_headline,
    sector_divergence,
    strongest,
    turnover_across_screens,
    universe,
    universe_stats,
)

REFERENCE = json.loads((Path(__file__).resolve().parents[2] / "data" / "reference.json").read_text())


@pytest.fixture(scope="module")
def inference():
    return inference_summary()


def test_universe_rows_match():
    py = [{
        "ticker": r.ticker, "sector": r.sector, "consensus": r.consensus, "score": r.divergence.score,
        "band": r.divergence.band, "profile": r.divergence.profile,
        "normalisedRange": r.divergence.normalised_range, "percentileRange": r.divergence.percentile_range,
        "stdDev": r.divergence.std_dev, "pillarRanges": r.divergence.pillar_ranges,
    } for r in universe()]
    assert py == REFERENCE["universe"]


def test_universe_stats_match():
    assert universe_stats() == REFERENCE["universeStats"]


def test_sector_divergence_matches():
    assert sector_divergence() == REFERENCE["sectorDivergence"]


def test_correlation_matrix_matches():
    assert correlation_matrix() == REFERENCE["correlationMatrix"]


@pytest.mark.parametrize("key", ["meanDivergence", "levelSpread", "rankSpread", "correlationInterval"])
def test_bootstrap_intervals_match(inference, key):
    assert inference[key] == REFERENCE["inference"][key]


def test_permutation_null_matches(inference):
    ts = REFERENCE["inference"]["nullTest"]
    py = inference["nullTest"]
    assert (py["observed"], py["null_mean"], py["null_low"], py["null_high"], py["p_value"]) == (
        ts["observed"], ts["nullMean"], ts["nullLow"], ts["nullHigh"], ts["pValue"])


def test_threshold_sensitivity_matches(inference):
    assert inference["sensitivity"] == REFERENCE["inference"]["sensitivity"]
    assert inference["sensitivityRange"] == REFERENCE["inference"]["sensitivityRange"]


def test_screens_match():
    assert [s.summary() for s in analyse_all_screens()] == REFERENCE["screens"]


def test_screening_headline_matches():
    assert screening_headline() == REFERENCE["screeningHeadline"]


def test_turnover_matches():
    assert turnover_across_screens() == REFERENCE["turnover"]


def test_predictors_match():
    ref = REFERENCE["predictors"]
    results = analyse_predictors()
    assert sum(r.supported for r in results) == ref["supported"]
    assert strongest(results).id == ref["strongest"]
    for py, ts in zip(results, ref["results"], strict=True):
        assert (py.id, py.spread, py.effect_size, py.effect_label, py.separated, py.supported) == (
            ts["id"], ts["spread"], ts["effectSize"], ts["effectLabel"], ts["separated"], ts["supported"])
        assert list(py.compared_groups) == ts["comparedGroups"]
        for g, tg in zip(py.groups, ts["groups"], strict=True):
            assert (g.label, g.n, asdict(g.interval)) == (tg["label"], tg["n"], tg["meanDivergence"])
