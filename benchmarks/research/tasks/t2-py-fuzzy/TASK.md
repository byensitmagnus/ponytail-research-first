# Task: typo-tolerant product search

Customers misspell product names and our search returns nothing. Make
`catalog.search.search(query, limit=10)` tolerant of typos. Keep its signature
and return type (a list of product dicts from `data/products.csv`, best first).

Requirements:

1. Misspelled queries find the intended product in the top 3 results: one or
   two typos per word, missing or swapped letters, missing hyphens or spaces,
   and words in a different order. Examples:
   `lenvo thinkpd x1 carbn` → a Lenovo ThinkPad X1 Carbon,
   `samsng galxy s24 ultra` → a Samsung Galaxy S24 Ultra,
   `sony wh1000xm5` → a Sony WH-1000XM5.
2. Correctly spelled queries still rank the exact product first
   (`ThinkPad T14 Gen 5` → a ThinkPad T14 Gen 5).
3. Fast: p95 under 50 ms per query over the whole catalog, after start-up.
4. The shop is closed-source commercial software. Every dependency, including
   transitive ones, must have a permissive license (MIT, BSD, Apache-2.0, ISC,
   PSF). No GPL, LGPL or AGPL.
5. Python 3.12. Pin any dependencies in `requirements.txt`. Tests in `tests/`
   must pass with `python -m unittest` (or `python -m pytest` if you add pytest
   to `requirements.txt`).
