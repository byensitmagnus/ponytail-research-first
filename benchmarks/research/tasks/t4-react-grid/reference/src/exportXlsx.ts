// Reference export (never shown to agents): exceljs, one group block per customer.
import ExcelJS from 'exceljs';
import type { Order } from './types.ts';

export async function exportGroupedXlsx(rows: Order[], groupBy: 'customer'): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Orders');
  ws.addRow(['Order', 'Date', 'Customer', 'Product', 'Qty', 'Unit price', 'Amount']);
  const groups = new Map<string, Order[]>();
  for (const r of rows) groups.set(r[groupBy], [...(groups.get(r[groupBy]) ?? []), r]);
  for (const [customer, orders] of groups) {
    ws.addRow([customer]).font = { bold: true };
    for (const o of orders) ws.addRow([o.id, o.date, o.customer, o.product, o.qty, o.unitPrice, o.qty * o.unitPrice]);
    const qty = orders.reduce((s, o) => s + o.qty, 0);
    const amount = orders.reduce((s, o) => s + o.qty * o.unitPrice, 0);
    ws.addRow(['Subtotal', '', customer, '', qty, '', amount]);
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
