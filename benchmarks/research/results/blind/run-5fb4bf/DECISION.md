# Orders Table Enhancement - Dependencies & Design

## New Dependencies

### exceljs@4.4.0
- **License**: MIT
- **Purpose**: Generate `.xlsx` files with grouped orders and subtotals
- **Why this fits**: 
  - Open-source and MIT-licensed
  - Handles complex workbook structures (merged cells, styling, formulas)
  - Well-maintained (pushed in last year, 100k+ weekly installs)
  - Supports Node.js environment where we build the file

### @types/exceljs@0.5.3
- **License**: MIT (via DefinitelyTyped)
- **Purpose**: TypeScript type definitions for exceljs
- **Dev-only dependency**

## Design Choices

### Table Features (No New Dependencies)
All sorting, filtering, pagination, and grouping logic is built with React hooks:
- **Sort**: Click column headers to sort ascending/descending; tracks active column
- **Filter**: Real-time text search across order ID, customer, product, date
- **Paginate**: 25 rows per page with Previous/Next buttons
- **Group**: Rows grouped by customer with customer header and subtotal row (qty sum, amount sum)

### Excel Export
- Implemented in `src/exportXlsx.ts` with the required signature
- Groups orders by customer on export (same as UI grouping)
- Each customer group has customer name header and subtotal row with sums
- Returns `Uint8Array` which is consumed by the React component

### Styling
- Minimal inline styles for clarity
- HTML table with borders, background colors for headers/subtotals
- Sortable column headers show ↑/↓ indicators

## Build & Audit
- `npm run build` passes (tsc + vite) ✓
- `npm audit --audit-level=high` passes ✓
  - 2 moderate vulnerabilities in transitive uuid dependency (from exceljs)
  - No high-level vulnerabilities

## Unused Complexity (Deliberately Skipped)
- External data table library (TanStack Table, Material-UI) — scope is small enough for hooks
- Custom CSS framework — inline styles sufficient for admin table
- Search/filter library — simple string matching covers the requirement
- Pagination component library — basic button UI is clear and minimal
