"""
Screenshot every page of the web app at 2x for the README.

    npm run build && npx next start -p 3100
    python/.venv/bin/python python/tools/capture_screenshots.py --app http://localhost:3100

The demo sign-in is a presentation cookie (see src/lib/session.ts), so it is set directly.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import quote, urlparse

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / "docs" / "screenshots"
DEMO_USER = {"name": "Anny Mondal", "email": "analyst@xyz-capital.com", "role": "ESG Research Analyst",
             "firm": "XYZ Capital"}

# (route, file, full page?)
PAGES = [
    ("/", "01_overview", True),
    ("/company/TSLA", "02_company_tsla", True),
    ("/company/XOM", "03_company_xom", True),
    ("/compare", "04_compare", True),
    ("/screening", "05_screening", True),
    ("/research", "06_research", True),
    ("/sectors", "07_sectors", True),
    ("/providers", "08_providers", True),
    ("/methodology", "09_methodology", False),
    ("/agents", "10_agents", True),
    ("/report", "11_report", False),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", default="http://localhost:3000")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    host = urlparse(args.app).hostname

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(f"{args.app}/login", wait_until="networkidle")
        page.screenshot(path=str(args.out / "00_login.png"))
        print("  00_login.png")
        ctx.close()

        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        ctx.add_cookies([{"name": "esg_demo_session", "value": quote(json.dumps(DEMO_USER, separators=(",", ":"))),
                          "domain": host, "path": "/"}])
        page = ctx.new_page()
        for route, name, full in PAGES:
            page.goto(args.app + route, wait_until="networkidle")
            page.wait_for_timeout(1200)  # let charts finish their entrance animation
            page.screenshot(path=str(args.out / f"{name}.png"), full_page=full)
            print(f"  {name}.png")
        browser.close()


if __name__ == "__main__":
    main()
