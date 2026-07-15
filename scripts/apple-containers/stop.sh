#!/bin/sh
set -eu

POSTGRES_NAME="${POSTGRES_CONTAINER_NAME:-ts-testing-postgres}"
KAFKA_NAME="${KAFKA_CONTAINER_NAME:-ts-testing-kafka}"

if ! command -v container >/dev/null 2>&1; then
  echo "Apple container CLI is not installed or not in PATH."
  exit 1
fi

container stop "$POSTGRES_NAME" >/dev/null 2>&1 || true
container stop "$KAFKA_NAME" >/dev/null 2>&1 || true
container rm "$POSTGRES_NAME" >/dev/null 2>&1 || true
container rm "$KAFKA_NAME" >/dev/null 2>&1 || true

echo "Apple Containers test dependencies are stopped."
