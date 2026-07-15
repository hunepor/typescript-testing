# TypeScript Testcontainers Automation

Project skeleton for integration test automation with:

- TypeScript
- Playwright Test
- Testcontainers for Node.js
- PostgreSQL
- Kafka

## Requirements

- Node.js 22+
- npm
- Docker Desktop or another Docker-compatible runtime available to Testcontainers, or Apple Containers on macOS

## Commands

```bash
npm run typecheck
npm test
npm run test:integration
```

## Apple Containers

Apple `container` is not a Docker-compatible Testcontainers backend. For Macs that use Apple Containers instead of Docker, this project supports a separate external dependency mode:

```bash
npm run containers:apple:start
npm run test:integration:apple
npm run containers:apple:stop
```

The start script runs PostgreSQL and Kafka with Apple `container`, publishes them on localhost, and the test helpers connect through environment variables instead of asking Testcontainers to create containers per test.

Default Apple Containers endpoints:

```text
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=automation
POSTGRES_USER=automation
POSTGRES_PASSWORD=automation
KAFKA_PORT=9092
KAFKA_BROKERS=127.0.0.1:9092
```

Override these values in the shell when needed. `KAFKA_PORT` controls the published localhost port; `KAFKA_BROKERS` defaults to `127.0.0.1:$KAFKA_PORT` and is what the tests use. See `.env.apple-containers.example` for the full set.

## Structure

```text
src/
  orders/
    order-events.ts
tests/
  integration/
    kafka.spec.ts
    order-pipeline.spec.ts
    postgres.spec.ts
  support/
    kafka-container.ts
    postgres-container.ts
    wait.ts
```

## What The Tests Cover

- `postgres.spec.ts` starts PostgreSQL in a container, migrates a table, writes an order event, and reads it back.
- `kafka.spec.ts` starts Kafka in a container, produces a message, and consumes it.
- `order-pipeline.spec.ts` starts Kafka and PostgreSQL together, consumes an order event from Kafka, and stores it in PostgreSQL.

## Notes

The first full test run can take longer because the selected container runtime needs to download:

- `postgres:16-alpine`
- `confluentinc/cp-kafka:7.5.0`

If `npm run test:integration` fails with `Could not find a working container runtime strategy`, use a Docker-compatible runtime or switch to the Apple Containers flow above.
