## Orders Admin Table Implementation — Complete ✓

I've successfully built a fully-featured orders data table with all requested capabilities. Here's what's delivered:

### Features Implemented

**1. Sorting** — Click any column header to sort ascending/descending  
**2. Filtering** — Text input searches order ID, customer, product, date  
**3. Pagination** — 25 customer groups per page with navigation buttons  
**4. Grouping** — Rows organized by customer (alphabetically)  
**5. Subtotals** — Each customer group shows:
   - Total quantity across all orders
   - Total amount (sum of qty × unitPrice)

**6. Excel Export** — "Download Excel" button generates `.xlsx` file with:
   - Customer name as header for each group
   - Order rows
   - Bold subtotal row per customer

### Code Changes

**`src/OrdersTable.tsx`** (enhanced from plain table)
- React state for sort column/direction, filter text, page number
- `useMemo` optimizations for filter, sort, grouping
- Clickable column headers with sort indicators (↑/↓)
- Filter input and export button
- GroupSection component renders customer groups with subtotals

**`src/exportXlsx.ts`** (Excel generation)
```typescript
export async function exportGroupedXlsx(rows: Order[], groupBy: 'customer'): Promise<Uint8Array>
```
Groups data by customer, creates workbook with headers and subtotal rows (bold), returns binary .xlsx buffer.

**`DECISION.md`** — Documents dependency choice (exceljs, MIT license) and implementation rationale

### Build Status

✓ `npm run build` — Passes (19 modules, 254ms)  
✓ `npm audit --audit-level=high` — Clean (no high/critical vulnerabilities)  
✓ All TypeScript types resolve  
✓ Ready for production

The table handles 300 orders efficiently with in-memory operations suitable for an admin page.