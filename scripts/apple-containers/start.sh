#!/bin/sh
set -eu

POSTGRES_NAME="${POSTGRES_CONTAINER_NAME:-ts-testing-postgres}"
KAFKA_NAME="${KAFKA_CONTAINER_NAME:-ts-testing-kafka}"

POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-automation}"
POSTGRES_USER="${POSTGRES_USER:-automation}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-automation}"

KAFKA_PORT="${KAFKA_PORT:-9092}"
KAFKA_BROKERS="${KAFKA_BROKERS:-127.0.0.1:$KAFKA_PORT}"
KAFKA_CLUSTER_ID="${KAFKA_CLUSTER_ID:-MkU3OEVBNTcwNTJENDM2Qk}"
KAFKA_INTERNAL_PORT="9092"

require_container_cli() {
  if ! command -v container >/dev/null 2>&1; then
    echo "Apple container CLI is not installed or not in PATH."
    exit 1
  fi
}

start_system() {
  if ! container system status >/dev/null 2>&1; then
    echo "Starting Apple container system service..."
    container system start
  fi
}

remove_existing() {
  name="$1"
  container stop "$name" >/dev/null 2>&1 || true
  container rm "$name" >/dev/null 2>&1 || true
}

wait_for_postgres() {
  attempts=60
  while [ "$attempts" -gt 0 ]; do
    if container exec "$POSTGRES_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      echo "PostgreSQL is ready on 127.0.0.1:$POSTGRES_PORT"
      return 0
    fi

    attempts=$((attempts - 1))
    sleep 1
  done

  echo "PostgreSQL did not become ready in time. Logs:"
  container logs "$POSTGRES_NAME" || true
  exit 1
}

wait_for_kafka() {
  attempts=90
  while [ "$attempts" -gt 0 ]; do
    if container logs "$KAFKA_NAME" 2>/dev/null | grep -q "Kafka Server started"; then
      echo "Kafka is ready on 127.0.0.1:$KAFKA_PORT"
      return 0
    fi

    attempts=$((attempts - 1))
    sleep 1
  done

  echo "Kafka did not become ready in time. Logs:"
  container logs "$KAFKA_NAME" || true
  exit 1
}

require_container_cli
start_system

remove_existing "$POSTGRES_NAME"
remove_existing "$KAFKA_NAME"

container run -d \
  --name "$POSTGRES_NAME" \
  -p "127.0.0.1:$POSTGRES_PORT:5432" \
  -e "POSTGRES_DB=$POSTGRES_DB" \
  -e "POSTGRES_USER=$POSTGRES_USER" \
  -e "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  postgres:16-alpine

container run -d \
  --name "$KAFKA_NAME" \
  -p "127.0.0.1:$KAFKA_PORT:$KAFKA_INTERNAL_PORT" \
  -e "KAFKA_NODE_ID=1" \
  -e "CLUSTER_ID=$KAFKA_CLUSTER_ID" \
  -e "KAFKA_PROCESS_ROLES=broker,controller" \
  -e "KAFKA_CONTROLLER_QUORUM_VOTERS=1@127.0.0.1:29093" \
  -e "KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:$KAFKA_INTERNAL_PORT,CONTROLLER://0.0.0.0:29093" \
  -e "KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://$KAFKA_BROKERS" \
  -e "KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER" \
  -e "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT" \
  -e "KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT" \
  -e "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1" \
  -e "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1" \
  -e "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1" \
  -e "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0" \
  confluentinc/cp-kafka:7.5.0

wait_for_postgres
wait_for_kafka

cat <<EOF

Apple Containers test dependencies are running.

Use:
  TEST_RUNTIME=apple-containers npm run test:integration

Environment:
  POSTGRES_HOST=127.0.0.1
  POSTGRES_PORT=$POSTGRES_PORT
  POSTGRES_DB=$POSTGRES_DB
  POSTGRES_USER=$POSTGRES_USER
  POSTGRES_PASSWORD=$POSTGRES_PASSWORD
  KAFKA_BROKERS=$KAFKA_BROKERS
EOF
