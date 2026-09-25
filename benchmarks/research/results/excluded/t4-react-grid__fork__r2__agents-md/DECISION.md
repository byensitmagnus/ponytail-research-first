# Decision Log

## Dependencies Added

### `exceljs@4.4.2`
- **License**: MIT
- **Why**: Purpose-built library for generating XLSX files. Handles Excel workbook creation, cell formatting, and binary export. No viable lightweight stdlib alternative for binary .xlsx format. Considered alternatives: SheetJS community edition (AGPL, different licensing model), JSZip manual approach (more complex). ExcelJS is the smallest maintained MIT-licensed option.
- **Usage**: `exportGroupedXlsx()` in `src/exportXlsx.ts` creates workbooks with grouped data and subtotal rows.

## Dependencies Unchanged

- **react**: 19.3.0 (existing)
- **react-dom**: 19.3.0 (existing)
- **typescript**: 5.9.3 (existing)
- **vite**: 8.3.1 (existing)

## Implementation Notes

1. **Table Features** (pure React, no additional dependencies):
   - **Sorting**: Click column headers to toggle ascending/descending. Handles all columns including computed amount.
   - **Filtering**: Text input searches across order ID, customer name, product, and date.
   - **Pagination**: 25 rows (customer groups) per page with Previous/Next buttons.
   - **Grouping**: Rows grouped by customer name (alphabetically) with subtotal rows showing summed quantity and amount.

2. **Excel Export**:
   - Returns properly formatted `.xlsx` workbook with customer-grouped view.
   - Subtotal rows (bold) show aggregated qty and amount per customer.
   - Workbook is generated on-demand, not pre-built.

3. **Security/Audits**:
   - `npm audit --audit-level=high` passes (no high/critical vulnerabilities).
   - Two moderate vulnerabilities in transitive UUID dependency (from exceljs) do not block audit in high mode.

## Trade-offs

- **Bundle size**: exceljs adds ~330KB gzip. Acceptable for admin page; considered acceptable tradeoff for no custom XLSX serialization.
- **Sorting**: Implements in-memory sort; fine for 300 rows. Add `ponytail: use server-side sort if 10k+ rows` if needed.
- **Pagination**: Groups (customers) paginated, not individual rows; simplifies subtotal logic and matches grouping intent.
