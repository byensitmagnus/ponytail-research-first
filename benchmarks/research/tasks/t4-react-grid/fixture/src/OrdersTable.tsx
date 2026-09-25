import type { Order } from './types.ts';

export function OrdersTable({ rows }: { rows: Order[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Unit price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id}>
            <td>{o.id}</td>
            <td>{o.date}</td>
            <td>{o.customer}</td>
            <td>{o.product}</td>
            <td>{o.qty}</td>
            <td>{o.unitPrice.toFixed(2)}</td>
            <td>{(o.qty * o.unitPrice).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
