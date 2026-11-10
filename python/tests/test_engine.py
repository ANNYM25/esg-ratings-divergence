"""Unit tests for the methodological decisions the analysis depends on."""
import pytest

from esg_divergence import compute_divergence, normalised_ratings_for, to_common_scale
from esg_divergence._compat import js_round, js_sum, make_rng
from esg_divergence.divergence import band_for, profile_for, spearman_raw
from esg_divergence.predictors import cohens_d, effect_label
from esg_divergence.screening import passes
from esg_divergence.statistics import bootstrap, percentile_of


class TestJsCompat:
    @pytest.mark.parametrize("value,dp,expected", [(2.45, 1, 2.5), (0.5, 0, 1), (-1.345, 2, -1.34), (42.85, 1, 42.9)])
    def test_round_half_up(self, value, dp, expected):
        assert js_round(value, dp) == expected

    def test_naive_summation(self):
        # Python 3.12+ sum() would compensate and return 1.0; JS (and js_sum) do not.
        assert js_sum([0.1] * 10) == 0.9999999999999999

    def test_mulberry32_known_sequence(self):
        rng = make_rng(20260822)
        draws = [rng() for _ in range(3)]
        assert all(0 <= d < 1 for d in draws)
        assert make_rng(20260822)() == draws[0]  # deterministic


class TestNormalisation:
    def test_sustainalytics_is_inverted_against_practical_max(self):
        # risk 0 is best; 50 is the practical worst
        assert to_common_scale("sustainalytics", 0) == 100
        assert to_common_scale("sustainalytics", 50) == 0
        assert to_common_scale("sustainalytics", 75) == 0  # clamped, not negative
        assert to_common_scale("sustainalytics", 25) == 50

    def test_msci_maps_0_10_to_0_100(self):
        assert to_common_scale("msci", 7.5) == 75

    def test_msci_letters_carry_bucket_width(self):
        tsla = {r.provider: r for r in normalised_ratings_for("TSLA")}
        low, high = tsla["msci"].band
        assert high - low > 10  # a letter grade is an interval, not a point

    def test_continuous_scales_get_rounding_band(self):
        r = {r.provider: r for r in normalised_ratings_for("MSFT")}["spcsa"]
        assert r.band == (max(0, r.normalised - 2.5), min(100, r.normalised + 2.5))

    def test_ratings_come_back_in_provider_order(self):
        assert [r.provider for r in normalised_ratings_for("xom")] == ["msci", "sustainalytics", "lseg", "spcsa"]


class TestDivergence:
    @pytest.mark.parametrize("score,band", [(0, "aligned"), (15, "aligned"), (15.1, "mild"), (35, "mild"),
                                            (36, "significant"), (60, "significant"), (61, "extreme")])
    def test_bands(self, score, band):
        assert band_for(score) == band

    def test_profiles(self):
        assert profile_for(30, 0) == "level"
        assert profile_for(5, 25) == "rank"
        assert profile_for(25, 25) == "both"
        assert profile_for(5, 5) == "none"

    def test_meta_is_caught_by_max_not_average(self):
        # the documented false negative the max() formula was introduced to fix
        d = compute_divergence("META")
        assert d.score == max(d.normalised_range, d.percentile_range)
        assert d.band != "aligned"

    def test_pairs_sorted_widest_first(self):
        pairs = compute_divergence("SHEL").pairs
        assert len(pairs) == 6
        assert pairs == sorted(pairs, key=lambda p: -p.normalised_delta)


class TestStatistics:
    def test_percentile_interpolates(self):
        assert percentile_of([0, 10], 0.5) == 5
        assert percentile_of([], 0.5) == 0

    def test_bootstrap_brackets_estimate(self):
        ci = bootstrap([10, 20, 30, 40, 50], iterations=500)
        assert ci.low <= ci.estimate <= ci.high

    def test_spearman_perfect_and_inverse(self):
        assert spearman_raw([1, 2, 3, 4], [10, 20, 30, 40]) == pytest.approx(1)
        assert spearman_raw([1, 2, 3, 4], [4, 3, 2, 1]) == pytest.approx(-1)

    def test_spearman_handles_ties(self):
        assert -1 <= spearman_raw([1, 1, 2, 3], [5, 6, 6, 7]) <= 1

    def test_cohens_d(self):
        assert cohens_d([1, 2, 3], [1, 2, 3]) == 0
        assert cohens_d([10, 11, 12], [1, 2, 3]) > 0.8
        assert effect_label(1.34) == "large" and effect_label(0.1) == "negligible"


class TestScreens:
    def test_absolute_floor_uses_level(self):
        r = {r.provider: r for r in normalised_ratings_for("MSFT")}["msci"]
        assert passes("absolute_threshold", "MSFT", "msci") == (r.normalised >= 50)

    def test_best_in_class_uses_sector_percentile(self):
        r = {r.provider: r for r in normalised_ratings_for("XOM")}["lseg"]
        assert passes("best_in_class", "XOM", "lseg") == (r.sector_percentile >= 50)
