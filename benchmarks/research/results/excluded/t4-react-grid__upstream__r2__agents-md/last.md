Done. I've implemented a complete data table with sort, filter, paginate, group, and Excel export—all with minimal, free dependencies.

**Core work:**
- Enhanced OrdersTable.tsx: sort headers (↑↓), text filter, pagination (25 customer groups), grouping with subtotals
- Implemented exportXlsx.ts: Excel workbook with grouped data and formatted subtotal rows
- Added exceljs@4.4.0 (MIT, the only free mature .xlsx library) 
- Build passes, audit passes at high level

**Location:** C:/Users/Usmo1/ponytail-haiku/runs/t4-react-grid__upstream__r2/work

See DECISION.md for detailed architecture and dependency rationale.