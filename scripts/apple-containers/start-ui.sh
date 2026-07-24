#!/bin/sh
set -eu

UI_CONTAINER_NAME="${UI_CONTAINER_NAME:-ts-testing-juice-shop}"
JUICE_SHOP_PORT="${JUICE_SHOP_PORT:-3000}"
JUICE_SHOP_IMAGE="${JUICE_SHOP_IMAGE:-bkimminich/juice-shop:v17.3.0}"

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
  container stop "$UI_CONTAINER_NAME" >/dev/null 2>&1 || true
  container rm "$UI_CONTAINER_NAME" >/dev/null 2>&1 || true
}

wait_for_juice_shop() {
  attempts=120
  while [ "$attempts" -gt 0 ]; do
    if curl -fsS "http://127.0.0.1:$JUICE_SHOP_PORT" >/dev/null 2>&1; then
      echo "Juice Shop is ready on http://127.0.0.1:$JUICE_SHOP_PORT"
      return 0
    fi

    attempts=$((attempts - 1))
    sleep 1
  done

  echo "Juice Shop did not become ready in time. Logs:"
  container logs "$UI_CONTAINER_NAME" || true
  exit 1
}

require_container_cli
start_system
remove_existing

container run -d \
  --name "$UI_CONTAINER_NAME" \
  -p "127.0.0.1:$JUICE_SHOP_PORT:3000" \
  "$JUICE_SHOP_IMAGE"

wait_for_juice_shop

cat <<EOF

Juice Shop UI test app is running.

Use:
  npm run test:ui

Environment:
  UI_APP_URL=http://127.0.0.1:$JUICE_SHOP_PORT
  JUICE_SHOP_PORT=$JUICE_SHOP_PORT
EOF
