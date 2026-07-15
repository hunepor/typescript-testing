import { expect, test } from "@playwright/test";
import {
  findOrderEvent,
  migrateOrderEvents,
  saveOrderCreatedEvent,
  type OrderCreatedEvent,
} from "../../src/orders/order-events.js";
import { createPostgresClient, startPostgresContainer } from "../support/postgres-container.js";

test("stores and reads order events in PostgreSQL testcontainer", async () => {
  const container = await startPostgresContainer();
  const client = await createPostgresClient(container);

  try {
    await migrateOrderEvents(client);

    const event: OrderCreatedEvent = {
      id: "order-1001",
      customerId: "customer-42",
      totalCents: 12_990,
    };

    await saveOrderCreatedEvent(client, event);

    await expect(async () => {
      await expect(findOrderEvent(client, event.id)).resolves.toEqual(event);
    }).toPass();
  } finally {
    await client.end();
    await container.stop();
  }
});
