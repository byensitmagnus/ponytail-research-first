// Run from the solution's folder with tsx: writes the workbook bytes to argv[2].
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const out = process.argv[2];
const mod = await import(pathToFileURL(path.resolve('src/exportXlsx.ts')).href);
const rows = [
  { id: 'SO-1', date: '2026-01-02', customer: 'Alpha Test ApS', product: 'Office Chair', qty: 2, unitPrice: 1000 },
  { id: 'SO-2', date: '2026-01-03', customer: 'Beta Test A/S', product: 'Keyboard', qty: 3, unitPrice: 499 },
  { id: 'SO-3', date: '2026-01-04', customer: 'Alpha Test ApS', product: 'Mouse', qty: 5, unitPrice: 299.5 },
  { id: 'SO-4', date: '2026-01-05', customer: 'Beta Test A/S', product: 'Webcam', qty: 1, unitPrice: 649 },
  { id: 'SO-5', date: '2026-01-06', customer: 'Gamma Test I/S', product: 'Desk Lamp', qty: 4, unitPrice: 399 },
];
const bytes = await mod.exportGroupedXlsx(rows, 'customer');
fs.writeFileSync(out, Buffer.from(bytes));
console.log(JSON.stringify({ ok: true, bytes: bytes.length, isUint8Array: bytes instanceof Uint8Array }));
