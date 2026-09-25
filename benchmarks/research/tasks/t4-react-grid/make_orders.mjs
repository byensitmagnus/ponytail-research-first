// Generate fixture/src/orders.ts deterministically (300 orders). Output is committed.
import fs from 'node:fs';
import path from 'node:path';

let seed = 20260925;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rand() * a.length)];
const customers = ['Nordic Office ApS', 'Byg & Bolig A/S', 'Lund IT Consult', 'Fjord Logistics', 'Aarhus Dental Clinic',
  'Green Leaf Café', 'Vestjysk Auto', 'Hansen & Co', 'Copenhagen Design Studio', 'Skagen Marine', 'Odense School Supplies', 'Polar Pharma'];
const products = [['Office Chair', 1000], ['Standing Desk', 3499], ['Monitor 27"', 2299], ['Docking Station', 1299], ['Keyboard', 499],
  ['Mouse', 299], ['Headset', 899], ['Laptop 14"', 8999], ['Webcam', 649], ['USB-C Cable', 99], ['Desk Lamp', 399], ['Whiteboard', 1199]];
const orders = [];
for (let i = 1; i <= 300; i++) {
  const [product, unitPrice] = pick(products);
  const day = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
  const month = String(1 + Math.floor(rand() * 9)).padStart(2, '0');
  orders.push({ id: `SO-${String(10000 + i)}`, date: `2026-${month}-${day}`, customer: pick(customers), product, qty: 1 + Math.floor(rand() * 20), unitPrice });
}
const out = path.join(import.meta.dirname, 'fixture', 'src', 'orders.ts');
fs.writeFileSync(out, `import type { Order } from './types.ts';\n\nexport const ORDERS: Order[] = ${JSON.stringify(orders, null, 1)};\n`);
console.log(orders.length, 'orders ->', out);
