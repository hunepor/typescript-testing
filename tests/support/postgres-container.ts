import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const POSTGRES_IMAGE = "postgres:16-alpine";

export async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase("automation")
    .withUsername("automation")
    .withPassword("automation")
    .start();
}

export async function createPostgresClient(container: StartedPostgreSqlContainer): Promise<Client> {
  const client = new Client({
    connectionString: container.getConnectionUri(),
  });

  await client.connect();
  return client;
}
