# Orders Table Implementation — Decisions

## Added Dependencies

### exceljs@4.4.0
- **License**: MIT
- **Why**: Only mature, free library for generating .xlsx files (Excel 2007+ format).
- **Rationale**: Avoids CSV or commercial solutions. Provides full control over workbook formatting, grouping, and styling. Alternative (sheetjs community edition) requires runtime license checking; exceljs is cleaner.

### uuid@14.0.2
- **License**: MIT
- **Why**: Transitive dependency of exceljs. Upgraded to latest for security.
- **Note**: Moderate CVE in earlier versions; current version is patched.

## Unchanged Dependencies
- React 19.3.0, React-DOM 19.3.0 (MVC framework)
- TypeScript 5.9.3, Vite 8.3.1 (build tooling)
- @types/* (type definitions)

## Architecture

### OrdersTable.tsx
**Approach**: Pure React with hooks, no table library.
- **State**: search string, sort column/direction, current page
- **Filtering**: Array.filter() on-demand; case-insensitive substring match across Order, Date, Customer, Product
- **Sorting**: Array.sort() with special handling for computed "amount" field (qty × unitPrice)
- **Grouping**: Object.groupBy pattern (reduce) to group by customer name
- **Pagination**: Slice grouped results into 25-customer-group pages
- **UI**: Clickable headers for sort, search input, Previous/Next buttons, subtotal rows per group

### exportXlsx.ts
**Approach**: ExcelJS Workbook with direct grouping.
- **Structure**: For each customer (in sorted order), add header row, then all orders, then subtotal row
- **Formatting**: Bold headers, gray subtotal row, proper number formatting (2 decimals for amounts)
- **Returns**: Uint8Array (binary .xlsx file) as specified

### Why No Heavy Libraries
1. **Table library** (react-table, ag-grid): Overkill for 300 rows; React hooks handle sort/filter/paginate efficiently
2. **UI kit** (Material-UI, shadcn): Spec specifies admin page; basic styled HTML suffices
3. **State management** (Redux, Zustand): Spec requires sort/filter/page state only; React hooks are enough

### Why No Paid Tiers
- **exceljs**: MIT, no commercial edition or feature gating
- **xlsx/sheetjs**: Community edition is free, but Pro edition has paid tier; avoided for clarity

## Results
- ✅ npm run build passes
- ✅ npm audit --audit-level=high passes (vulnerabilities are moderate)
- ✅ Sort, filter, paginate, group, export all working
- ✅ Free and open-source throughout

## Known Limitations (Ponytail comments where applicable)
None — the implementation covers all stated requirements within minimal scope.
