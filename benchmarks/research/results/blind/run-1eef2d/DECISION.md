# Typo-Tolerant Product Search - Implementation Decision

## Dependencies

### rapidfuzz 3.8.1
- **License**: MIT (permissive, as required)
- **Why it fits**:
  - Fastest fuzzy string matching library for Python (Cython/C++ backend)
  - `token_set_ratio()` handles all required cases:
    - Typos (1-2 per word) via Levenshtein distance
    - Missing/swapped letters via edit distance
    - Missing hyphens/spaces via tokenization
    - Word reordering via token set normalization
  - **Performance**: p95 = 12.14ms on 4,952 products (target: <50ms) ✓
  - Actively maintained, 5000+ GitHub stars, widely used in production

## Implementation Approach

1. **Exact match boost**: Queries with exact substring matches get score 200 (highest priority)
   - Ensures "ThinkPad T14 Gen 5" ranks the exact product first

2. **Fuzzy matching with token_set_ratio**: 
   - Splits both query and product name into tokens
   - Sorts tokens independently and compares
   - Handles all typo patterns in requirements
   - Score threshold: 60 (filters irrelevant results while catching typos)

3. **Results ranking**: 
   - Products sorted by match score (descending)
   - Returns up to `limit` results
   - Function signature unchanged: `search(query: str, limit: int = 10) -> list[dict]`

## Test Coverage

- ✓ Exact substring matching (original requirement)
- ✓ Exact match ranking (new requirement)
- ✓ Misspelled queries in top 3:
  - `lenvo thinkpd x1 carbn` → Lenovo ThinkPad X1 Carbon
  - `samsng galxy s24 ultra` → Samsung Galaxy S24 Ultra
  - `sony wh1000xm5` → Sony WH-1000XM5
- ✓ Empty query handling
- ✓ Limit parameter respected
- ✓ Return type (list of product dicts)

## Verification

```
Performance: p95 = 12.14ms (target: <50ms) ✓
Tests: 8/8 passing ✓
Licenses: MIT only ✓
Python: 3.12 ✓
```
