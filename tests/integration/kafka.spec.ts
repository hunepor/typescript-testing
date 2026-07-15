import { expect, test } from "@playwright/test";
import { KafkaJS } from "@confluentinc/kafka-javascript";
import { startKafkaContainer, createKafkaClient, createKafkaTopic, uniqueTopic } from "../support/kafka-container.js";
import { waitFor } from "../support/wait.js";

type ConsumedMessage = {
  key: string;
  value: string;
};

async function consumeMessages(
  kafka: KafkaJS.Kafka,
  topic: string,
  expectedCount: number,
): Promise<{
  consumer: KafkaJS.Consumer;
  messages: ConsumedMessage[];
}> {
  const messages: ConsumedMessage[] = [];
  const consumer = kafka.consumer({
    kafkaJS: {
      groupId: uniqueTopic("orders-consumer"),
      fromBeginning: true,
    },
  });

  await consumer.connect();
  await consumer.subscribe({ topic });
  await consumer.run({
    eachMessage: async ({ message }) => {
      messages.push({
        key: message.key?.toString() ?? "",
        value: message.value?.toString() ?? "",
      });
    },
  });

  await waitFor(async () => (messages.length >= expectedCount ? messages : null));

  return { consumer, messages };
}

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
    await createKafkaTopic(kafka, topic);
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

test("preserves Kafka message key and value", async () => {
  const container = await startKafkaContainer();
  const kafka = createKafkaClient(container, "automation-tests");
  const topic = uniqueTopic("orders");
  const producer = kafka.producer();
  let consumer: KafkaJS.Consumer | undefined;

  try {
    await producer.connect();
    await createKafkaTopic(kafka, topic);
    await producer.send({
      topic,
      messages: [{ key: "order-1002", value: JSON.stringify({ status: "paid" }) }],
    });

    const result = await consumeMessages(kafka, topic, 1);
    consumer = result.consumer;

    expect(result.messages[0]).toEqual({
      key: "order-1002",
      value: JSON.stringify({ status: "paid" }),
    });
  } finally {
    await consumer?.disconnect();
    await producer.disconnect();
    await container.stop();
  }
});

test("consumes multiple Kafka messages from the same topic", async () => {
  const container = await startKafkaContainer();
  const kafka = createKafkaClient(container, "automation-tests");
  const topic = uniqueTopic("orders");
  const producer = kafka.producer();
  let consumer: KafkaJS.Consumer | undefined;

  try {
    await producer.connect();
    await createKafkaTopic(kafka, topic);
    await producer.send({
      topic,
      messages: [
        { key: "order-1003", value: JSON.stringify({ status: "created" }) },
        { key: "order-1004", value: JSON.stringify({ status: "cancelled" }) },
      ],
    });

    const result = await consumeMessages(kafka, topic, 2);
    consumer = result.consumer;

    expect(result.messages).toEqual(
      expect.arrayContaining([
        { key: "order-1003", value: JSON.stringify({ status: "created" }) },
        { key: "order-1004", value: JSON.stringify({ status: "cancelled" }) },
      ]),
    );
  } finally {
    await consumer?.disconnect();
    await producer.disconnect();
    await container.stop();
  }
});

test("allows independent consumer groups to read the same Kafka message", async () => {
  const container = await startKafkaContainer();
  const kafka = createKafkaClient(container, "automation-tests");
  const topic = uniqueTopic("orders");
  const producer = kafka.producer();
  let firstConsumer: KafkaJS.Consumer | undefined;
  let secondConsumer: KafkaJS.Consumer | undefined;

  try {
    await producer.connect();
    await createKafkaTopic(kafka, topic);
    await producer.send({
      topic,
      messages: [{ key: "order-1005", value: JSON.stringify({ status: "created" }) }],
    });

    const firstResult = await consumeMessages(kafka, topic, 1);
    firstConsumer = firstResult.consumer;
    const secondResult = await consumeMessages(kafka, topic, 1);
    secondConsumer = secondResult.consumer;

    expect(firstResult.messages[0]?.value).toBe(JSON.stringify({ status: "created" }));
    expect(secondResult.messages[0]?.value).toBe(JSON.stringify({ status: "created" }));
  } finally {
    await firstConsumer?.disconnect();
    await secondConsumer?.disconnect();
    await producer.disconnect();
    await container.stop();
  }
});
