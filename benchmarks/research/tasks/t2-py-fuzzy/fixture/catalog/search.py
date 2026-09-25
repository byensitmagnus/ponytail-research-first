"""Product search for the shop. See TASK.md."""
import csv
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "products.csv"

with DATA.open(encoding="utf-8") as f:
    PRODUCTS = list(csv.DictReader(f))


def search(query: str, limit: int = 10) -> list[dict]:
    """Return up to `limit` products, best match first."""
    q = query.lower()
    return [p for p in PRODUCTS if q in p["name"].lower()][:limit]
