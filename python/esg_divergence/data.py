"""Load the shared dataset (exported from the TypeScript source by `npm run export:data`)."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PROVIDER_IDS: tuple[str, ...] = ("msci", "sustainalytics", "lseg", "spcsa")
PILLARS: tuple[str, ...] = ("environmental", "social", "governance")


def default_data_dir() -> Path:
    if env := os.environ.get("ESG_DATA_DIR"):
        return Path(env)
    return Path(__file__).resolve().parents[2] / "data"


@dataclass(frozen=True, eq=False)  # identity hash, so analyses can be cached per dataset
class Dataset:
    companies: list[dict]
    ratings: list[dict]
    providers: dict[str, dict]
    sectors: dict[str, dict]

    @property
    def tickers(self) -> list[str]:
        return [c["ticker"] for c in self.companies]

    def company(self, ticker: str) -> dict | None:
        return next((c for c in self.companies if c["ticker"] == ticker.upper()), None)

    def rating(self, ticker: str, provider: str) -> dict | None:
        return next((r for r in self.ratings if r["ticker"] == ticker and r["provider"] == provider), None)


def load_dataset(data_dir: str | Path | None = None) -> Dataset:
    root = Path(data_dir) if data_dir else default_data_dir()
    companies = json.loads((root / "companies.json").read_text(encoding="utf-8"))
    return Dataset(
        companies=companies["companies"],
        ratings=json.loads((root / "ratings.json").read_text(encoding="utf-8")),
        providers=json.loads((root / "providers.json").read_text(encoding="utf-8")),
        sectors=companies["sectors"],
    )


@lru_cache(maxsize=1)
def dataset() -> Dataset:
    """The default dataset, loaded once."""
    return load_dataset()
