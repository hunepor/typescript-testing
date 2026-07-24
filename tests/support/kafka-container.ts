import { KafkaContainer, type StartedKafkaContainer } from "@testcontainers/kafka";
import { KafkaJS } from "@confluentinc/kafka-javascript";

const KAFKA_IMAGE = "confluentinc/cp-kafka:7.5.0";
const KAFKA_PORT = 9093;

export type TestKafkaContainer = {
  getBootstrapServers(): string[];
  stop(): Promise<void>;
};

function isTestcontainersRuntime(): boolean {
  return process.env.TEST_RUNTIME === "testcontainers";
}

function createTestcontainersKafkaContainer(container: StartedKafkaContainer): TestKafkaContainer {
  return {
    getBootstrapServers: () => [`${container.getHost()}:${container.getMappedPort(KAFKA_PORT)}`],
    stop: async () => {
      await container.stop();
    },
  };
}

function createExternalKafkaContainer(): TestKafkaContainer {
  return {
    getBootstrapServers: () => (process.env.KAFKA_BROKERS ?? "127.0.0.1:9092").split(","),
    stop: async () => {
      // External dependencies are managed outside the test process in this mode.
    },
  };
}

export async function startKafkaContainer(): Promise<TestKafkaContainer> {
  if (isTestcontainersRuntime()) {
    const container = await new KafkaContainer(KAFKA_IMAGE).withKraft().start();
    return createTestcontainersKafkaContainer(container);
  }

  return createExternalKafkaContainer();
}

export function createKafkaClient(container: TestKafkaContainer, clientId: string): KafkaJS.Kafka {
  return new KafkaJS.Kafka({
    kafkaJS: {
      brokers: container.getBootstrapServers(),
      clientId,
      logLevel: KafkaJS.logLevel.ERROR,
    },
  });
}

export async function createKafkaTopic(kafka: KafkaJS.Kafka, topic: string): Promise<void> {
  const admin = kafka.admin();

  await admin.connect();
  try {
    await admin.createTopics({
      topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
    });
  } finally {
    await admin.disconnect();
  }
}

export function uniqueTopic(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
