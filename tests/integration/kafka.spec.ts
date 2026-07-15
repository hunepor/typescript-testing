import { expect, test } from "@playwright/test";
import { startKafkaContainer, createKafkaClient, uniqueTopic } from "../support/kafka-container.js";

test("produces and consumes a Kafka message with testcontainers", async () => {
  const container = await startKafkaContainer();
  const kafka = createKafkaClient(container, "automation-tests");
  const topic = uniqueTopic("orders");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("orders-consumer"),
      fromBeginning: true,
    },
  });

  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic });

    const consumed = new Promise<string>((resolve) => {
      void consumer.run({
        eachMessage: async ({ message }) => {
          resolve(message.value?.toString() ?? "");
        },
      });
    });

    await producer.send({
      topic,
      messages: [{ key: "order-1001", value: JSON.stringify({ status: "created" }) }],
    });

    await expect(consumed).resolves.toBe(JSON.stringify({ status: "created" }));
  } finally {
    await consumer.disconnect();
    await producer.disconnect();
    await container.stop();
  }
});
