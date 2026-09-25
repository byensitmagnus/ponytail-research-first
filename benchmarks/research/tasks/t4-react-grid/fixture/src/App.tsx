import { ORDERS } from './orders.ts';
import { OrdersTable } from './OrdersTable.tsx';

export function App() {
  return (
    <main>
      <h1>Orders</h1>
      <OrdersTable rows={ORDERS} />
    </main>
  );
}
