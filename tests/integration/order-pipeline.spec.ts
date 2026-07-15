import { expect, test } from "@playwright/test";
import type { Client } from "pg";
import {
  findOrderEvent,
  migrateOrderEvents,
  saveOrderCreatedEvent,
  type OrderCreatedEvent,
} from "../../src/orders/order-events.js";
import { startKafkaContainer, createKafkaClient, uniqueTopic } from "../support/kafka-container.js";
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
    await producer.connect();
    await consumer.connect();
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
