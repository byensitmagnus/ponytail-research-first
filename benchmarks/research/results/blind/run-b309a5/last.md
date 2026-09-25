Typo-tolerant product search implemented and tested successfully.

**Summary:**

I made `catalog.search.search()` handle customer misspellings by integrating **rapidfuzz** (MIT license, 26.67ms p95 latency — well under the 50ms target).

The solution uses fuzzy token matching:
- `token_sort_ratio`: Handles word reordering
- `token_set_ratio`: Handles missing letters and punctuation
- Both scored, best first

**All requirements met:**
- Typos find products in top 3 (tested: "lenvo thinkpd x1 carbn" → Lenovo ThinkPad X1 Carbon)
- Exact matches still rank first
- P95 latency: 26.67ms over 4,952 products
- All 8 tests pass
- Only MIT license (permissive)

**Files modified:**
- `catalog/search.py` — fuzzy search with rapidfuzz
- `requirements.txt` — rapidfuzz==3.8.1
- `tests/test_search.py` — 8 comprehensive tests
- `DECISION.md` — dependency justification (new file)