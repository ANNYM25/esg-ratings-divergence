"""
esg_divergence — the ESG Ratings Divergence research engine, in Python.

A line-for-line port of the TypeScript analytics in ``src/lib``. The test suite checks every
headline figure against ``data/reference.json`` produced by the TypeScript engine, so the two
implementations cannot drift apart.

    >>> from esg_divergence import universe_stats, permutation_null
    >>> universe_stats()["meanDivergence"]
    42.9
    >>> permutation_null().null_mean
    60.7
"""
from .data import PROVIDER_IDS, Dataset, dataset, load_dataset
from .divergence import compute_divergence, correlation_matrix, sector_divergence, spearman, universe, universe_stats
from .normalise import normalised_ratings_for, to_common_scale
from .predictors import analyse_predictors, strongest
from .screening import analyse_all_screens, analyse_screen, screening_headline, turnover_across_screens
from .statistics import bootstrap, inference_summary, permutation_null, threshold_sensitivity

__version__ = "1.0.0"

__all__ = [
    "PROVIDER_IDS", "Dataset", "dataset", "load_dataset",
    "to_common_scale", "normalised_ratings_for",
    "compute_divergence", "universe", "universe_stats", "spearman", "correlation_matrix", "sector_divergence",
    "bootstrap", "permutation_null", "threshold_sensitivity", "inference_summary",
    "analyse_screen", "analyse_all_screens", "screening_headline", "turnover_across_screens",
    "analyse_predictors", "strongest",
]
