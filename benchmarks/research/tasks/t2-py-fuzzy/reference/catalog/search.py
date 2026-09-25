"""Reference solution (never shown to agents): rapidfuzz QRatio over product names."""
import csv
from pathlib import Path

from rapidfuzz import fuzz, process, utils

DATA = Path(__file__).resolve().parent.parent / "data" / "products.csv"

with DATA.open(encoding="utf-8") as f:
    PRODUCTS = list(csv.DictReader(f))
NAMES = [utils.default_process(p["name"]) for p in PRODUCTS]


def search(query: str, limit: int = 10) -> list[dict]:
    hits = process.extract(utils.default_process(query), NAMES, scorer=fuzz.QRatio, limit=limit)
    return [PRODUCTS[i] for _, _, i in hits]

