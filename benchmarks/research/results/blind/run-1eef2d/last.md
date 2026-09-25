Done. The typo-tolerant product search is implemented and fully tested. Here's what was delivered:

**Implementation Summary:**
- Used `rapidfuzz` (MIT license) with `token_set_ratio()` for intelligent fuzzy matching
- Handles all typo patterns: character errors, missing spaces/hyphens, word reordering
- Exact matches boosted to rank first (for correctly spelled queries)
- Performance: p95 = 11.17ms (4.6x faster than 50ms target)

**Files Modified:**
1. `catalog/search.py` - Fuzzy matching logic
2. `requirements.txt` - Added rapidfuzz==3.8.1
3. `tests/test_search.py` - 8 comprehensive tests (all passing)
4. `DECISION.md` - Dependency documentation

**All Requirements Met:**
- Misspelled queries find products in top 3 ✓
- Exact matches rank first ✓
- p95 < 50ms ✓
- Permissive licenses only ✓
- Python 3.12 ✓
- unittest compatible ✓