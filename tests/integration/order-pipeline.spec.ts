import { expect, test } from "@playwright/test";
import type { Client } from "pg";
import {
  findOrderEvent,
  migrateOrderEvents,
  saveOrderCreatedEvent,
  type OrderCreatedEvent,
} from "../../src/orders/order-events.js";
import { startKafkaContainer, createKafkaClient, createKafkaTopic, uniqueTopic } from "../support/kafka-container.js";
import { createPostgresClient, startPostgresContainer } from "../support/postgres-container.js";
import { waitFor } from "../support/wait.js";

async function handleOrderMessage(client: Client, value: string | undefined): Promise<void> {
  if (!value) {
    return;
  }

  const event = JSON.parse(value) as OrderCreatedEvent;
  await saveOrderCreatedEvent(client, event);
}

test("moves an order-created event from Kafka into PostgreSQL", async () => {
  const postgres = await startPostgresContainer();
  const kafkaContainer = await startKafkaContainer();
  const pgClient = await createPostgresClient(postgres);
  const kafka = createKafkaClient(kafkaContainer, "order-pipeline-tests");
  const topic = uniqueTopic("order-created");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("order-pipeline"),
      fromBeginning: true,
    },
  });

  try {
    await migrateOrderEvents(pgClient);
    await pgClient.query("TRUNCATE TABLE order_events");
    await producer.connect();
    await consumer.connect();
    await createKafkaTopic(kafka, topic);
    await consumer.subscribe({ topic });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleOrderMessage(pgClient, message.value?.toString());
      },
    });

    const event: OrderCreatedEvent = {
      id: "order-2002",
      customerId: "customer-77",
      totalCents: 25_500,
    };

    await producer.send({
      topic,
      messages: [{ key: event.id, value: JSON.stringify(event) }],
    });

    await expect(waitFor(() => findOrderEvent(pgClient, event.id))).resolves.toEqual(event);
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    await pgClient.end();
    await kafkaContainer.stop();
    await postgres.stop();
  }
});

test("moves multiple order-created events from Kafka into PostgreSQL", async () => {
  const postgres = await startPostgresContainer();
  const kafkaContainer = await startKafkaContainer();
  const pgClient = await createPostgresClient(postgres);
  const kafka = createKafkaClient(kafkaContainer, "order-pipeline-tests");
  const topic = uniqueTopic("order-created");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("order-pipeline"),
      fromBeginning: true,
    },
  });

  try {
    await migrateOrderEvents(pgClient);
    await pgClient.query("TRUNCATE TABLE order_events");
    await producer.connect();
    await consumer.connect();
    await createKafkaTopic(kafka, topic);
    await consumer.subscribe({ topic });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleOrderMessage(pgClient, message.value?.toString());
      },
    });

    const events: OrderCreatedEvent[] = [
      {
        id: "order-2003",
        customerId: "customer-78",
        totalCents: 10_000,
      },
      {
        id: "order-2004",
        customerId: "customer-79",
        totalCents: 20_000,
      },
    ];

    await producer.send({
      topic,
      messages: events.map((event) => ({ key: event.id, value: JSON.stringify(event) })),
    });

    await expect(waitFor(() => findOrderEvent(pgClient, events[0].id))).resolves.toEqual(events[0]);
    await expect(waitFor(() => findOrderEvent(pgClient, events[1].id))).resolves.toEqual(events[1]);
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    await pgClient.end();
    await kafkaContainer.stop();
    await postgres.stop();
  }
});

test("ignores empty Kafka order messages", async () => {
  const postgres = await startPostgresContainer();
  const kafkaContainer = await startKafkaContainer();
  const pgClient = await createPostgresClient(postgres);
  const kafka = createKafkaClient(kafkaContainer, "order-pipeline-tests");
  const topic = uniqueTopic("order-created");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("order-pipeline"),
      fromBeginning: true,
    },
  });

  try {
    await migrateOrderEvents(pgClient);
    await pgClient.query("TRUNCATE TABLE order_events");
    await producer.connect();
    await consumer.connect();
    await createKafkaTopic(kafka, topic);
    await consumer.subscribe({ topic });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleOrderMessage(pgClient, message.value?.toString());
      },
    });

    await producer.send({
      topic,
      messages: [{ key: "empty-order", value: null }],
    });

    const result = await pgClient.query("SELECT COUNT(*)::int AS count FROM order_events");

    expect(result.rows[0]).toEqual({ count: 0 });
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    await pgClient.end();
    await kafkaContainer.stop();
    await postgres.stop();
  }
});

test("updates PostgreSQL when Kafka receives the same order id again", async () => {
  const postgres = await startPostgresContainer();
  const kafkaContainer = await startKafkaContainer();
  const pgClient = await createPostgresClient(postgres);
  const kafka = createKafkaClient(kafkaContainer, "order-pipeline-tests");
  const topic = uniqueTopic("order-created");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("order-pipeline"),
      fromBeginning: true,
    },
  });

  try {
    await migrateOrderEvents(pgClient);
    await pgClient.query("TRUNCATE TABLE order_events");
    await producer.connect();
    await consumer.connect();
    await createKafkaTopic(kafka, topic);
    await consumer.subscribe({ topic });

    await consumer.run({
      eachMessage: async ({ message }) => {
        await handleOrderMessage(pgClient, message.value?.toString());
      },
    });

    const initialEvent: OrderCreatedEvent = {
      id: "order-2005",
      customerId: "customer-80",
      totalCents: 30_000,
    };
    const updatedEvent: OrderCreatedEvent = {
      ...initialEvent,
      totalCents: 35_000,
    };

    await producer.send({
      topic,
      messages: [
        { key: initialEvent.id, value: JSON.stringify(initialEvent) },
        { key: updatedEvent.id, value: JSON.stringify(updatedEvent) },
      ],
    });

    await expect(waitFor(() => findOrderEvent(pgClient, updatedEvent.id))).resolves.toEqual(updatedEvent);
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    await pgClient.end();
    await kafkaContainer.stop();
    await postgres.stop();
  }
});
