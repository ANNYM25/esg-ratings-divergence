"""
Publication figures for the README and the notebook.

    python -m esg_divergence.figures            # writes docs/figures/*.png
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from .data import PROVIDER_IDS
from .divergence import correlation_matrix, universe
from .predictors import analyse_predictors
from .screening import SCREENS, analyse_all_screens, turnover_across_screens
from .statistics import permutation_draws, permutation_null, threshold_sensitivity

INK, MUTED, GRID = "#0f172a", "#64748b", "#e2e8f0"
PROVIDER_COLOURS = {"msci": "#2563eb", "sustainalytics": "#059669", "lseg": "#d97706", "spcsa": "#7c3aed"}
PROVIDER_NAMES = {"msci": "MSCI", "sustainalytics": "Sustainalytics", "lseg": "LSEG", "spcsa": "S&P Global"}
BAND_COLOURS = {"aligned": "#22c55e", "mild": "#84cc16", "significant": "#f59e0b", "extreme": "#ef4444"}

plt.rcParams.update({
    "font.family": "sans-serif", "font.size": 10, "axes.edgecolor": GRID, "axes.labelcolor": MUTED,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.titleweight": "bold", "axes.titlesize": 12,
    "axes.titlecolor": INK, "axes.titlelocation": "left", "axes.spines.top": False, "axes.spines.right": False,
    "figure.dpi": 110, "savefig.dpi": 200, "savefig.bbox": "tight", "savefig.facecolor": "white",
})


def fig_divergence_ranking():
    rows = universe()
    fig, ax = plt.subplots(figsize=(10, 8.2))
    y = np.arange(len(rows))[::-1]
    for yi, r in zip(y, rows, strict=True):
        ax.barh(yi, r.divergence.score, color=BAND_COLOURS[r.divergence.band], height=0.7)
        ax.text(r.divergence.score + 0.8, yi, f"{r.divergence.score:g}", va="center", fontsize=8, color=MUTED)
    ax.set_yticks(y, [f"{r.ticker}" for r in rows], fontsize=8.5)
    for x in (15, 35, 60):
        ax.axvline(x, color=GRID, lw=1, zorder=0)
    ax.set_xlim(0, 100)
    ax.set_xlabel("Divergence score = max(level spread, rank spread)")
    ax.set_title("How far the four raters disagree, company by company")
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in BAND_COLOURS.values()]
    ax.legend(handles, [b.title() for b in BAND_COLOURS], loc="lower right", frameon=False, ncol=4)
    return fig


def fig_correlation_heatmap():
    m = correlation_matrix()
    grid = np.array([[m[f"{a}:{b}"] for b in PROVIDER_IDS] for a in PROVIDER_IDS])
    fig, ax = plt.subplots(figsize=(6.2, 5.2))
    im = ax.imshow(grid, cmap="Blues", vmin=0, vmax=1)
    labels = [PROVIDER_NAMES[p] for p in PROVIDER_IDS]
    ax.set_xticks(range(4), labels, rotation=20)
    ax.set_yticks(range(4), labels)
    for i in range(4):
        for j in range(4):
            ax.text(j, i, f"{grid[i, j]:.2f}", ha="center", va="center",
                    color="white" if grid[i, j] > 0.6 else INK, fontsize=11, fontweight="bold")
    ax.set_title("Spearman rank correlation between raters")
    ax.text(0, 1.02, "Berg, Kölbel & Rigobon (2022) report 0.38–0.71", transform=ax.transAxes, color=MUTED, fontsize=8.5)
    fig.colorbar(im, ax=ax, shrink=0.8)
    ax.spines[:].set_visible(False)
    return fig


def fig_permutation_null():
    test = permutation_null()
    _, draws = permutation_draws(test.iterations)

    fig, ax = plt.subplots(figsize=(9, 4.2))
    ax.hist(draws, bins=32, color="#cbd5e1", edgecolor="white")
    ax.axvspan(test.null_low, test.null_high, color="#e2e8f0", alpha=0.6, zorder=0, label="95% of null")
    ax.axvline(test.observed, color="#ef4444", lw=2.5, label=f"Observed: {test.observed}")
    ax.axvline(test.null_mean, color=MUTED, lw=1.2, ls="--", label=f"Null mean: {test.null_mean}")
    ax.set_xlabel("Mean divergence across 30 companies")
    ax.set_ylabel("Permutations")
    ax.set_title(f"The raters agree far more than chance (p < {max(test.p_value, 1 / test.iterations):.3f})")
    ax.legend(frameon=False, loc="upper left")
    return fig


def fig_screening_impact():
    impacts = analyse_all_screens()
    turnover = {t["screen"]: t for t in turnover_across_screens()}
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.4), gridspec_kw={"width_ratios": [1.15, 1]})
    names = [SCREENS[s.screen] for s in impacts]
    shares = [s.contested_share for s in impacts]
    ax = axes[0]
    bars = ax.barh(names[::-1], shares[::-1], color=["#f59e0b" if v >= 50 else "#0ea5b7" for v in shares[::-1]])
    ax.bar_label(bars, [f"{v:g}%" for v in shares[::-1]], padding=4, color=INK, fontweight="bold")
    ax.set_xlim(0, 80)
    ax.set_xlabel("Holdings whose eligibility depends on the vendor")
    ax.set_title("Same 30 companies, four mandates")

    ax = axes[1]
    cost = [turnover[s.screen]["costBpMid"] for s in impacts]
    lo = [turnover[s.screen]["costBpLow"] for s in impacts]
    hi = [turnover[s.screen]["costBpHigh"] for s in impacts]
    x = np.arange(len(impacts))
    ax.bar(x, cost, color="#0b2545", width=0.6)
    ax.errorbar(x, cost, yerr=[np.subtract(cost, lo), np.subtract(hi, cost)], fmt="none", ecolor=MUTED, capsize=5)
    for xi, c, h in zip(x, cost, hi, strict=True):
        ax.text(xi, h + 0.8, f"{c:g}bp", ha="center", color=INK, fontweight="bold")
    ax.set_ylim(0, max(hi) * 1.15)
    ax.set_xticks(x, [n.replace(" ", "\n", 1) for n in names], fontsize=8.5)
    ax.set_ylabel("One-off switching cost (bp)")
    ax.set_title("Cost of changing ESG vendor (worst pair)")
    fig.tight_layout()
    return fig


def _short(label: str) -> str:
    return label.replace("Product ", "").replace(" disclosure", "").replace(" carbon", "")


def fig_predictors():
    results = analyse_predictors()
    fig, axes = plt.subplots(1, 4, figsize=(14, 4), sharey=True)
    titles = {"disclosure": "Disclosure", "product": "Product alignment", "controversy": "Controversy",
              "carbon": "Carbon intensity"}
    for ax, r in zip(axes, results, strict=True):
        est = [g.interval.estimate for g in r.groups]
        err = [[g.interval.estimate - g.interval.low for g in r.groups],
               [g.interval.high - g.interval.estimate for g in r.groups]]
        colours = ["#ef4444" if g.label == r.compared_groups[0] else "#94a3b8" for g in r.groups]
        bars = ax.bar(range(len(est)), est, color=colours, width=0.65)
        for bar, g in zip(bars, r.groups, strict=True):
            if g.underpowered:  # n < 3: shown, but excluded from the effect size
                bar.set_hatch("///")
                bar.set_alpha(0.45)
        ax.errorbar(range(len(est)), est, yerr=err, fmt="none", ecolor=INK, capsize=4, lw=1)
        ax.set_xticks(range(len(est)), [f"{_short(g.label)}\nn={g.n}" for g in r.groups], fontsize=8)
        verdict = "✓ supported" if r.supported else "✗ not supported"
        ax.set_title(f"{titles[r.id]}\nd = {r.effect_size} · {verdict}", fontsize=10)
    axes[0].set_ylabel("Mean divergence (95% CI)")
    fig.text(0.01, -0.02, "Red: group with the highest divergence among adequately powered groups. "
             "Hatched: n < 3, excluded from the effect size.", color=MUTED, fontsize=8.5)
    fig.suptitle("Divergence is predictable from company characteristics", x=0.01, ha="left",
                 fontweight="bold", color=INK, fontsize=13)
    fig.tight_layout()
    return fig


def fig_threshold_sensitivity():
    pts = threshold_sensitivity()
    fig, ax = plt.subplots(figsize=(8, 3.6))
    xs, ys = [p["threshold"] for p in pts], [p["contestedShare"] for p in pts]
    ax.plot(xs, ys, marker="o", color="#0b2545", lw=2)
    ax.fill_between(xs, ys, color="#13c4e3", alpha=0.15)
    for x, y in zip(xs, ys, strict=True):
        ax.annotate(f"{y:g}%", (x, y), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=8.5)
    ax.set_xlabel("Mandate holds the top X% of the universe")
    ax.set_ylabel("Contested holdings")
    ax.set_ylim(0, max(ys) + 12)
    ax.set_title("The finding survives any reasonable threshold")
    return fig


def fig_rater_scatter():
    from .frame import scores_wide

    wide = scores_wide()
    fig, ax = plt.subplots(figsize=(6.4, 6))
    ax.scatter(wide["msci"], wide["sustainalytics"], s=60, color="#2563eb", alpha=0.8, edgecolor="white")
    for t, row in wide.iterrows():
        ax.annotate(t, (row["msci"], row["sustainalytics"]), fontsize=7, color=MUTED, xytext=(3, 3),
                    textcoords="offset points")
    ax.plot([0, 100], [0, 100], color=GRID, ls="--")
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_xlabel("MSCI (normalised 0–100)")
    ax.set_ylabel("Sustainalytics (normalised 0–100)")
    ax.set_title("Two raters, one company universe")
    return fig


FIGURES = {
    "divergence_ranking": fig_divergence_ranking,
    "correlation_heatmap": fig_correlation_heatmap,
    "permutation_null": fig_permutation_null,
    "screening_impact": fig_screening_impact,
    "predictors": fig_predictors,
    "threshold_sensitivity": fig_threshold_sensitivity,
    "rater_scatter": fig_rater_scatter,
}


def main(out_dir: str | None = None) -> None:
    plt.switch_backend("Agg")  # headless; notebooks keep their inline backend
    out = Path(out_dir) if out_dir else Path(__file__).resolve().parents[2] / "docs" / "figures"
    out.mkdir(parents=True, exist_ok=True)
    for name, build in FIGURES.items():
        fig = build()
        fig.savefig(out / f"{name}.png")
        plt.close(fig)
        print(f"  {out / name}.png")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
