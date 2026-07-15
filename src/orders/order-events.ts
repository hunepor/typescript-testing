import type { Client } from "pg";

export type OrderCreatedEvent = {
  id: string;
  customerId: string;
  totalCents: number;
};

export async function migrateOrderEvents(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveOrderCreatedEvent(client: Client, event: OrderCreatedEvent): Promise<void> {
  await client.query(
    `
      INSERT INTO order_events (id, customer_id, total_cents)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET customer_id = EXCLUDED.customer_id,
          total_cents = EXCLUDED.total_cents
    `,
    [event.id, event.customerId, event.totalCents],
  );
}

export async function findOrderEvent(client: Client, id: string): Promise<OrderCreatedEvent | null> {
  const result = await client.query<{
    id: string;
    customer_id: string;
    total_cents: number;
  }>(
    `
      SELECT id, customer_id, total_cents
      FROM order_events
      WHERE id = $1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    customerId: row.customer_id,
    totalCents: row.total_cents,
  };
}
