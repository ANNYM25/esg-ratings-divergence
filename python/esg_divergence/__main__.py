"""
Headline research findings in the terminal.

    python -m esg_divergence                # full report
    python -m esg_divergence company TSLA   # one company, all four raters
    python -m esg_divergence --svg out.svg  # also save the report as an SVG screenshot
"""
from __future__ import annotations

import argparse

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .data import PROVIDER_IDS, dataset
from .divergence import compute_divergence, spearman, universe, universe_stats
from .normalise import normalised_ratings_for
from .predictors import analyse_predictors, strongest
from .screening import SCREENS, analyse_all_screens, screening_headline, turnover_across_screens
from .statistics import bootstrap, permutation_null

NAMES = {"msci": "MSCI", "sustainalytics": "Sustainalytics", "lseg": "LSEG", "spcsa": "S&P Global"}
BAND_STYLE = {"aligned": "green", "mild": "yellow3", "significant": "dark_orange", "extreme": "red"}


def report(console: Console) -> None:
    stats = universe_stats()
    rows = universe()
    ci = bootstrap([r.divergence.score for r in rows])
    null = permutation_null()
    head = screening_headline()
    turnover = turnover_across_screens()

    console.print(Panel.fit(
        f"[bold]{head['meanContestedShare']:g}%[/] of holdings change eligibility depending on which ESG vendor is licensed\n"
        f"Worst-case portfolio overlap between two vendors: [bold]{head['worstOverlap']['overlap']:g}%[/] "
        f"({NAMES[head['worstOverlap']['a']]} vs {NAMES[head['worstOverlap']['b']]}, {head['worstOverlap']['screen']})\n"
        f"Switching vendor costs up to [bold]{turnover[0]['costBpMid']:g}bp[/] one-off "
        f"(vs {turnover[-1]['costBpMid']:g}bp on the most robust mandate)",
        title=f"ESG ratings divergence · {stats['companies']} companies × {stats['providers']} raters",
        border_style="cyan"))

    t = Table(title="1 · The disagreement is real, not noise", title_justify="left")
    t.add_column("Statistic")
    t.add_column("Value", justify="right")
    t.add_row("Mean divergence (bootstrap 95% CI)", str(ci))
    t.add_row("Independent-rater null (95% range)", f"{null.null_mean} ({null.null_low}–{null.null_high})")
    t.add_row("p-value (500 permutations)", f"< {1 / null.iterations:.3f}" if null.p_value == 0 else f"{null.p_value}")
    t.add_row("Material disagreements (significant + extreme)", f"{stats['materialShare']:g}%")
    for i, a in enumerate(PROVIDER_IDS):
        for b in PROVIDER_IDS[i + 1:]:
            t.add_row(f"Spearman ρ  {NAMES[a]} ~ {NAMES[b]}", f"{spearman(a, b):.2f}")
    console.print(t)

    preds = analyse_predictors()
    top = strongest(preds)
    t = Table(title=f"2 · It is predictable · {sum(p.supported for p in preds)}/4 hypotheses hold", title_justify="left")
    for col in ("Driver", "Compared", "Spread", "Cohen's d", "Supported"):
        t.add_column(col, justify="right" if col in ("Spread", "Cohen's d") else "left")
    for p in preds:
        t.add_row(("★ " if p is top else "") + p.id, " vs ".join(p.compared_groups), f"{p.spread:+.1f}",
                  f"{p.effect_size:.2f} ({p.effect_label})", "[green]yes[/]" if p.supported else "[red]no[/]")
    console.print(t)

    t = Table(title="3 · Screen design matters more than vendor choice", title_justify="left")
    for col in ("Mandate", "Contested", "Min overlap", "Switch cost (bp)"):
        t.add_column(col, justify="left" if col == "Mandate" else "right")
    cost = {x["screen"]: x for x in turnover}
    for s in analyse_all_screens():
        t.add_row(SCREENS[s.screen], f"{s.contested_share:g}%", f"{s.min_overlap['overlap']:g}%",
                  f"{cost[s.screen]['costBpLow']}–{cost[s.screen]['costBpHigh']}")
    console.print(t)

    t = Table(title="Most divergent companies", title_justify="left")
    for col in ("Ticker", "Sector", "Score", "Band", "Profile", "Consensus"):
        t.add_column(col)
    for r in rows[:8]:
        d = r.divergence
        t.add_row(r.ticker, r.sector, f"{d.score:g}", f"[{BAND_STYLE[d.band]}]{d.band}[/]", d.profile, f"{r.consensus:g}")
    console.print(t)
    console.print("[dim]Calibrated synthetic data — research and education only, not investment advice.[/]")


def company(console: Console, ticker: str) -> None:
    c = dataset().company(ticker)
    if not c:
        console.print(f"[red]Unknown ticker {ticker}[/]")
        return
    d = compute_divergence(ticker)
    t = Table(title=f"{c['name']} ({c['ticker']}) · {c['subIndustry']}", title_justify="left")
    for col in ("Rater", "Native", "Normalised", "Band", "Sector pctl"):
        t.add_column(col, justify="left" if col in ("Rater", "Native") else "right")
    for r in normalised_ratings_for(ticker):
        t.add_row(NAMES[r.provider], r.label, f"{r.normalised:g}", f"{r.band[0]:g}–{r.band[1]:g}", f"{r.sector_percentile:g}")
    console.print(t)
    console.print(f"Divergence [bold]{d.score:g}[/] ([{BAND_STYLE[d.band]}]{d.band}[/]) · profile [bold]{d.profile}[/] · "
                  f"level spread {d.normalised_range:g} · rank spread {d.percentile_range:g}")


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="python -m esg_divergence")
    ap.add_argument("command", nargs="?", default="report", choices=["report", "company"])
    ap.add_argument("ticker", nargs="?")
    ap.add_argument("--svg", help="save the output as an SVG screenshot")
    args = ap.parse_args(argv)

    console = Console(record=bool(args.svg))
    if args.command == "company":
        company(console, args.ticker or "TSLA")
    else:
        report(console)
    if args.svg:
        console.save_svg(args.svg, title="python -m esg_divergence")


if __name__ == "__main__":
    main()
