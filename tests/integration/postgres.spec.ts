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

test("runs order event migration more than once", async () => {
  const container = await startPostgresContainer();
  const client = await createPostgresClient(container);

  try {
    await migrateOrderEvents(client);
    await migrateOrderEvents(client);

    const result = await client.query("SELECT to_regclass('public.order_events') AS table_name");

    expect(result.rows[0]).toEqual({ table_name: "order_events" });
  } finally {
    await client.end();
    await container.stop();
  }
});

test("updates existing order events by id", async () => {
  const container = await startPostgresContainer();
  const client = await createPostgresClient(container);

  try {
    await migrateOrderEvents(client);

    const initialEvent: OrderCreatedEvent = {
      id: "order-1002",
      customerId: "customer-42",
      totalCents: 12_990,
    };
    const updatedEvent: OrderCreatedEvent = {
      ...initialEvent,
      totalCents: 14_990,
    };

    await saveOrderCreatedEvent(client, initialEvent);
    await saveOrderCreatedEvent(client, updatedEvent);

    await expect(findOrderEvent(client, updatedEvent.id)).resolves.toEqual(updatedEvent);
  } finally {
    await client.end();
    await container.stop();
  }
});

test("returns null when an order event does not exist", async () => {
  const container = await startPostgresContainer();
  const client = await createPostgresClient(container);

  try {
    await migrateOrderEvents(client);

    await expect(findOrderEvent(client, "missing-order")).resolves.toBeNull();
  } finally {
    await client.end();
    await container.stop();
  }
});
