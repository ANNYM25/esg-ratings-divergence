"""
Render the README banner, the GitHub social preview and the CLI screenshot from HTML.

    python/.venv/bin/python python/tools/build_banner.py

Headline numbers are computed live from the engine, so the artwork can never disagree with the analysis.
"""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

from esg_divergence import permutation_null, screening_headline, spearman, turnover_across_screens, universe_stats

FIGURES = Path(__file__).resolve().parents[2] / "docs" / "figures"


def banner_html(height: int) -> str:
    head = screening_headline()
    stats = universe_stats()
    null = permutation_null()
    cost = turnover_across_screens()[0]["costBpMid"]
    rhos = [spearman(a, b) for a, b in [("msci", "sustainalytics"), ("msci", "lseg"), ("msci", "spcsa"),
                                         ("sustainalytics", "lseg"), ("sustainalytics", "spcsa"), ("lseg", "spcsa")]]
    raters = "".join(f"<span style='--c:{c}'>{n}</span>" for n, c in
                     [("MSCI", "#60a5fa"), ("Sustainalytics", "#a78bfa"), ("LSEG", "#2dd4bf"), ("S&amp;P Global", "#f472b6")])
    return f"""
<div class="b" style="height:{height}px">
  <div class="dots"></div>
  <div class="l">
    <div class="logo"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#062e1f" stroke-width="2.6"
      stroke-linecap="round"><path d="M6 20V11M12 20V5M18 20v-7"/></svg></div>
    <h1>ESG Ratings Divergence</h1>
    <p class="t">Four raters. One universe. <em>{head['meanContestedShare']:g}%</em> disagreement on what's investable.</p>
    <div class="r">{raters}</div>
    <p class="s">TypeScript app · Python research engine · tested to the same decimal</p>
  </div>
  <div class="k">
    <div><b>{head['meanContestedShare']:g}%</b><i>holdings change eligibility with the vendor</i></div>
    <div><b>{head['worstOverlap']['overlap']:g}%</b><i>worst portfolio overlap between two raters</i></div>
    <div><b>{stats['meanDivergence']:g}</b><i>mean divergence vs {null.null_mean:g} for unrelated raters</i></div>
    <div><b>{cost:g}bp</b><i>one-off cost of switching ESG vendor</i></div>
    <div class="w"><b>ρ {min(rhos):.2f}–{max(rhos):.2f}</b><i>pairwise rank correlation, in the Berg–Kölbel–Rigobon range</i></div>
  </div>
</div>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: Inter, 'SF Pro Display', -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }}
.b {{ width:1280px; position:relative; overflow:hidden; display:flex; align-items:center; gap:44px; padding:0 60px; color:#ecfdf5;
  background: radial-gradient(900px 420px at 88% 10%, rgba(52,211,153,.30), transparent 60%),
              linear-gradient(125deg, #03241a 0%, #0b3d2c 55%, #11553c 100%); }}
.dots {{ position:absolute; inset:0; opacity:.16; background-image: radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: linear-gradient(90deg, black, transparent 65%); }}
.l {{ position:relative; flex:1.1; }}
.logo {{ width:64px; height:64px; border-radius:16px; display:grid; place-items:center; margin-bottom:20px;
  background: linear-gradient(140deg, #a7f3d0, #34d399); box-shadow: 0 10px 40px rgba(52,211,153,.4); }}
h1 {{ font-size:52px; letter-spacing:-1.6px; font-weight:800; line-height:1.02; }}
.t {{ font-size:21px; margin-top:12px; color:#d1fae5; }} .t em {{ font-style:normal; color:#6ee7b7; font-weight:700; }}
.r {{ display:flex; gap:8px; margin-top:20px; flex-wrap:wrap; }}
.r span {{ font-size:13px; padding:6px 12px; border-radius:999px; background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.16); color:#ecfdf5; display:flex; align-items:center; gap:7px; }}
.r span::before {{ content:''; width:8px; height:8px; border-radius:50%; background:var(--c); }}
.s {{ font-size:13px; color:#a7f3d0; margin-top:18px; opacity:.85; }}
.k {{ position:relative; flex:1; display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
.k div {{ background:rgba(255,255,255,.95); color:#052e1f; border-radius:16px; padding:16px 18px; box-shadow:0 18px 50px rgba(0,0,0,.3); }}
.k .w {{ grid-column: span 2; background:#ecfdf5; }}
.k b {{ display:block; font-size:30px; letter-spacing:-.8px; color:#065f46; }}
.k i {{ font-style:normal; font-size:12.5px; color:#475569; }}
</style>"""


def main() -> None:
    FIGURES.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1300, "height": 700}, device_scale_factor=2)
        for name, height in [("banner", 420), ("social-preview", 640)]:
            page.set_content(banner_html(height))
            page.locator(".b").screenshot(path=str(FIGURES / f"{name}.png"))
            print(f"  docs/figures/{name}.png")
        svg = FIGURES / "cli_report.svg"
        if svg.exists():  # produced by: python -m esg_divergence --svg docs/figures/cli_report.svg
            page.set_content(f"<body style='margin:0'>{svg.read_text()}</body>")
            page.locator("svg").screenshot(path=str(FIGURES / "cli_report.png"))
            print("  docs/figures/cli_report.png")
        browser.close()


if __name__ == "__main__":
    main()
