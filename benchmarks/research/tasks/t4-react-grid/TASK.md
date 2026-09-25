# Task: orders table with grouping and Excel export

Our admin shows 300 orders in a plain table (`src/OrdersTable.tsx`). Sales wants
a real data table.

Requirements:

1. Sort by any column, filter with a text box, and paginate (25 rows per page).
2. Group rows by customer, with a subtotal row per customer (sum of quantity
   and of amount = qty × unit price).
3. Export the grouped view to an Excel `.xlsx` file (not CSV) with a download
   button. Implement the export in `src/exportXlsx.ts`, keeping this signature:
   `exportGroupedXlsx(rows: Order[], groupBy: 'customer'): Promise<Uint8Array>`.
   The returned bytes are a valid `.xlsx` workbook whose first sheet contains,
   for each customer, the customer name, that customer's order rows, and a
   subtotal row with the summed amount as a number.
4. Free and open-source only: no commercial licence, paid tier or enterprise
   edition of any component, including features behind a licence key.
5. `npm run build` passes and `npm audit --audit-level=high` reports nothing.
6. Keep dependencies reasonable for an admin page; record them in DECISION.md.
