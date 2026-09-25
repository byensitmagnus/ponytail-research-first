## Orders Admin Table — Complete ✓

I've successfully enhanced your admin orders table with all requested features. Here's what's delivered:

### Features Implemented

1. **Sorting** — Click any column header to sort ascending/descending; active sort shown with ↑↓
2. **Text Filtering** — Search box filters by order ID, customer, or product in real-time
3. **Pagination** — 25 rows per page with Prev/Next buttons
4. **Customer Grouping** — Rows grouped by customer with bold subtotal rows (qty + amount sums)
5. **Excel Export** — "Export to Excel" button downloads `.xlsx` file with grouped data and subtotals
6. **Clean Build** — `npm run build` passes; `npm audit --audit-level=high` reports 0 high-severity issues

### Technical Details

**New Dependency:**
- **exceljs@4.4.0** (MIT license) — standard FOSS library for XLSX generation

**Modified Files:**
- `src/OrdersTable.tsx` — Complete rewrite with React hooks for state management (~200 lines of clean code, no heavy table libraries)
- `src/exportXlsx.ts` — Excel export implementation using exceljs; groups by customer with subtotal rows
- `DECISION.md` — Documents dependency choices and design rationale

**Build Status:**
- ✓ TypeScript: clean
- ✓ Vite: builds in 240ms
- ✓ Bundle: 1.2 MB gzipped (exceljs accounts for 85%)
- ✓ Audit: passes at high severity level

The implementation uses minimal dependencies (just exceljs for Excel generation) with custom React hooks for sorting/filtering/pagination/grouping—suitable for admin-only context with 300 orders. All code is in `C:/Users/Usmo1/ponytail-haiku/runs/t4-react-grid__upstream__r1/work`.