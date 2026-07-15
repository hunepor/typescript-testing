import { KafkaContainer, type StartedKafkaContainer } from "@testcontainers/kafka";
import { KafkaJS } from "@confluentinc/kafka-javascript";

const KAFKA_IMAGE = "confluentinc/cp-kafka:7.5.0";
const KAFKA_PORT = 9093;

export async function startKafkaContainer(): Promise<StartedKafkaContainer> {
  return new KafkaContainer(KAFKA_IMAGE).withKraft().start();
}

export function createKafkaClient(container: StartedKafkaContainer, clientId: string): KafkaJS.Kafka {
  return new KafkaJS.Kafka({
    kafkaJS: {
      brokers: [`${container.getHost()}:${container.getMappedPort(KAFKA_PORT)}`],
      clientId,
      logLevel: KafkaJS.logLevel.ERROR,
    },
  });
}

export function uniqueTopic(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
