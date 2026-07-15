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
- Docker Desktop or another Docker-compatible runtime available to Testcontainers

## Commands

```bash
npm run typecheck
npm test
npm run test:integration
```

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

The first full test run can take longer because Docker needs to download:

- `postgres:16-alpine`
- `confluentinc/cp-kafka:7.5.0`

If tests fail with `Could not find a working container runtime strategy`, start Docker Desktop or expose a Docker-compatible socket before running the suite.
