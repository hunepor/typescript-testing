#!/bin/sh
set -eu

UI_CONTAINER_NAME="${UI_CONTAINER_NAME:-ts-testing-juice-shop}"

if ! command -v container >/dev/null 2>&1; then
  echo "Apple container CLI is not installed or not in PATH."
  exit 1
fi

container stop "$UI_CONTAINER_NAME" >/dev/null 2>&1 || true
container rm "$UI_CONTAINER_NAME" >/dev/null 2>&1 || true

echo "Juice Shop UI test app is stopped."
