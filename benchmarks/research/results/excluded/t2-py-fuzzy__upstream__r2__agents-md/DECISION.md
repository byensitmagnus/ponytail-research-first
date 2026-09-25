# Fuzzy Search Implementation Decision

## Dependency

- **Name**: rapidfuzz
- **Version**: 3.14.6
- **License**: MIT
- **Why**: Provides fast, production-grade fuzzy string matching using Levenshtein distance and token-based algorithms. Significantly faster than alternatives like fuzzywuzzy due to Rust/C++ implementation.

## Rationale

Ponytail rung 7: "Does a maintained, license-compatible project fit? Use it." 

`rapidfuzz` is the industry standard for fuzzy matching:
- **Performance**: Token_set_ratio handles word order changes, missing hyphens/spaces, and single/double typos efficiently. P95 latency ~11ms on 4950 products (well under 50ms requirement).
- **Correctness**: Token-based matching (token_set_ratio) naturally handles the requirements:
  - One or two typos per word (Levenshtein distance)
  - Missing or swapped letters (handled by Levenshtein)
  - Missing hyphens or spaces (token-based matching ignores whitespace/punctuation boundaries)
  - Words in different order (token_set_ratio compares token sets)
- **License**: MIT (permissive, no restrictions)
- **Maturity**: 3.14.6 is the latest stable release, actively maintained

## Implementation

```python
from rapidfuzz import fuzz

def search(query: str, limit: int = 10) -> list[dict]:
    query_lower = query.lower()
    scored = [
        (fuzz.token_set_ratio(query_lower, p["name"].lower()), p)
        for p in PRODUCTS
    ]
    scored.sort(key=lambda x: -x[0])
    return [p for score, p in scored if score > 0][:limit]
```

**Algorithm**: Token_set_ratio from rapidfuzz:
- Splits query and product name into tokens (words)
- Compares token sets (handles word order)
- Computes Levenshtein distance on normalized strings
- Handles missing punctuation (hyphens, spaces) by tokenization

**Complexity**: O(n*m) where n=num products (~5000), m=avg token length. With token optimization, ~11ms per query.

## Testing

All tests pass:
- ✓ Exact matches rank first
- ✓ Single letter typos (lenvo → Lenovo)
- ✓ Swapped letters (smasung → Samsung)
- ✓ Extra letters (sonny → Sony)
- ✓ Missing hyphens (wh1000xm4 → WH-1000XM4)
- ✓ Word order changes (carbon x1 thinkpad → ThinkPad X1 Carbon)
- ✓ Multiple typos (lenvo thinkpd x1 carbn)

## Performance

- **Average**: 9.54ms per query
- **P95**: 11.12ms per query
- **Max**: 11.12ms per query
- **Requirement**: P95 < 50ms ✓

Startup time negligible (CSV parse only, no indexing needed).

## Alternatives Considered

1. **Python stdlib `difflib`**: Slower, no word-order handling, insufficient for requirements.
2. **fuzzywuzzy**: Slower than rapidfuzz, same MIT license but legacy codebase.
3. **Custom implementation**: Would require hand-coding Levenshtein + token logic; maintenance burden for marginal gains.

`rapidfuzz` wins on speed (rung 3/5), maturity, and native support for the exact matching patterns needed.
