import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const POSTGRES_IMAGE = "postgres:16-alpine";

export type TestPostgresContainer = {
  getConnectionUri(): string;
  stop(): Promise<void>;
};

function isAppleContainersRuntime(): boolean {
  return process.env.TEST_RUNTIME === "apple-containers";
}

function createApplePostgresContainer(): TestPostgresContainer {
  const host = process.env.POSTGRES_HOST ?? "127.0.0.1";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const database = process.env.POSTGRES_DB ?? "automation";
  const username = process.env.POSTGRES_USER ?? "automation";
  const password = process.env.POSTGRES_PASSWORD ?? "automation";

  return {
    getConnectionUri: () => `postgresql://${username}:${password}@${host}:${port}/${database}`,
    stop: async () => {
      // Apple Containers are managed by scripts/apple-containers/*.sh in this mode.
    },
  };
}

function createTestcontainersPostgresContainer(container: StartedPostgreSqlContainer): TestPostgresContainer {
  return {
    getConnectionUri: () => container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}

export async function startPostgresContainer(): Promise<TestPostgresContainer> {
  if (isAppleContainersRuntime()) {
    return createApplePostgresContainer();
  }

  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase("automation")
    .withUsername("automation")
    .withPassword("automation")
    .start();

  return createTestcontainersPostgresContainer(container);
}

export async function createPostgresClient(container: Pick<StartedPostgreSqlContainer, "getConnectionUri">): Promise<Client> {
  const client = new Client({
    connectionString: container.getConnectionUri(),
  });

  await client.connect();
  return client;
}
