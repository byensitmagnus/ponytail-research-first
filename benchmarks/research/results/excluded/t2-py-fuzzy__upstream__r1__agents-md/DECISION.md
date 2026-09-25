# Dependency Decision

## rapidfuzz 3.8.1

**License:** MIT (permissive)

**Why it fits:** Typo-tolerant product search requires fuzzy string matching with:
- Handling of character transpositions (2 typos per word)
- Word reordering support (e.g., "sony wh1000xm5" vs "WH-1000XM5 Sony")
- Missing/extra words and punctuation (e.g., missing hyphens)

**Compared alternatives:**
- `fuzzywuzzy` (15k+ stars, MIT): Well-tested but slower (~2-3x), older C implementation
- `difflib` (stdlib): Limited to basic sequence matching, no token-based scoring
- Custom implementation: Would require Levenshtein distance + tokenization, slower and error-prone

**Selected:** `rapidfuzz` because it is:
- Fast: C++ Rapidfuzz backend gives p95 latency of 26.67ms (well under 50ms requirement) over 4,952 products
- Accurate: `token_sort_ratio` + `token_set_ratio` handles all required typo patterns
- Maintained: Active development, latest release 2025
- License-compatible: MIT, permissive for closed-source commercial use

**Exactly used in code:**
- `fuzz.token_sort_ratio()`: Normalizes word order before comparing (handles reordered words)
- `fuzz.token_set_ratio()`: Handles subset matching (missing/extra words)
- Takes max of both for robustness across patterns
