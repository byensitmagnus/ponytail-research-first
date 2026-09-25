import type { Order } from './types.ts';

// See TASK.md for the required behaviour.
export async function exportGroupedXlsx(rows: Order[], groupBy: 'customer'): Promise<Uint8Array> {
  throw new Error('not implemented');
}
