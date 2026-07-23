# TypeScript Testcontainers Automation

Project skeleton for TypeScript test automation with:

- TypeScript 7
- Playwright Test 1.61
- Testcontainers for Node.js 12
- PostgreSQL
- Kafka
- OWASP Juice Shop UI tests
- Appium 3 and WebDriverIO 9 for iOS Safari and native iOS smoke tests

## Requirements

- Node.js 24.18.0 or another Node.js 24+ runtime
- npm
- Docker Desktop or another Docker-compatible runtime available to Testcontainers, or Apple Containers on macOS
- Xcode with the required iOS platform installed for Appium iOS tests

## Commands

```bash
npm run typecheck
npm test
npm run test:integration
npm run test:ui
npm run test:mobile:ios
npm run test:mobile:ios:native
npm run test:mobile:ios:wdio
```

Useful Appium commands:

```bash
npm run appium:driver:install:xcuitest
npm run appium:driver:list
npm run appium:server
```

## Apple Containers

Apple `container` is not a Docker-compatible Testcontainers backend. For Macs that use Apple Containers instead of Docker, this project supports a separate external dependency mode.

For PostgreSQL and Kafka integration tests:

```bash
npm run containers:apple:start
npm run test:integration:apple
npm run containers:apple:stop
```

For UI tests against OWASP Juice Shop:

```bash
npm run containers:apple:start:ui
npm run test:ui:apple
npm run containers:apple:stop:ui
```

The start scripts publish services on localhost, and the test helpers connect through environment variables instead of asking Testcontainers to create containers per test.

Default Apple Containers endpoints:

```text
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=automation
POSTGRES_USER=automation
POSTGRES_PASSWORD=automation
KAFKA_PORT=9092
KAFKA_BROKERS=127.0.0.1:9092
JUICE_SHOP_PORT=3000
UI_APP_URL=http://127.0.0.1:3000
MOBILE_APP_URL=http://127.0.0.1:3000
APPIUM_HOST=127.0.0.1
APPIUM_PORT=4723
IOS_DEVICE_NAME=iPhone 17 Pro
IOS_PLATFORM_VERSION=26.5
APPIUM_WEBVIEW_CONNECT_TIMEOUT=30000
IOS_NATIVE_APP_BUNDLE_ID=com.apple.Preferences
```

Override these values in the shell when needed. `KAFKA_PORT` controls the published localhost port; `KAFKA_BROKERS` defaults to `127.0.0.1:$KAFKA_PORT` and is what the tests use. See `.env.apple-containers.example` for the full set.

## Appium iOS Safari

Mobile browser tests use Appium with the XCUITest driver and an iOS Simulator. Start Juice Shop first, start Appium in another terminal, then run the mobile Safari suite:

```bash
npm run containers:apple:start:ui
npm run appium:driver:install:xcuitest
npm run appium:server
npm run test:mobile:ios
```

`tests/mobile/ios-safari/juice-shop.spec.ts` opens OWASP Juice Shop in iOS Safari and checks storefront loading and invalid login handling.

## Appium Native iOS

Native iOS app smoke tests use the same Appium server and launch the Settings app by default:

```bash
npm run appium:server
npm run test:mobile:ios:native
```

`tests/mobile/ios-native/settings.spec.ts` uses Playwright Test as the runner with Appium helpers.

`tests/mobile/ios-native/settings-wdio.spec.ts` covers the same native Settings smoke flow through WebDriverIO. Run it with:

```bash
npm run appium:server
npm run test:mobile:ios:wdio
```

Xcode must have the iOS platform installed for the active Xcode version. If WebDriverAgent fails with `iOS <version> is not installed`, open Xcode > Settings > Components and install the missing iOS platform.

Useful environment overrides:

```text
APPIUM_HOST=127.0.0.1
APPIUM_PORT=4723
IOS_DEVICE_NAME=iPhone 17 Pro
IOS_PLATFORM_VERSION=26.5
APPIUM_WEBVIEW_CONNECT_TIMEOUT=30000
IOS_NATIVE_APP_BUNDLE_ID=com.apple.Preferences
```

The Appium server must be running before `npm run test:mobile:ios`, `npm run test:mobile:ios:native`, or `npm run test:mobile:ios:wdio`.

## Test Documentation

Structured test-case documentation lives beside the related tests:

```text
tests/ui/juice-shop.test-cases.yaml
```

The clickable test-case index is:

```text
tests/TEST-CASES.md
```

YAML files are the source of truth for test-case details. Markdown is used only for navigation.

## Structure

```text
src/
  orders/
    order-events.ts
tests/
  TEST-CASES.md
  integration/
    kafka.spec.ts
    order-pipeline.spec.ts
    postgres.spec.ts
  ui/
    juice-shop.spec.ts
    juice-shop.test-cases.yaml
  mobile/
    ios-native/
      settings.spec.ts
      settings-wdio.spec.ts
    ios-safari/
      juice-shop.spec.ts
  support/
    appium.ts
    kafka-container.ts
    postgres-container.ts
    ui-app.ts
    wait.ts
    webdriverio.ts
```

## What The Tests Cover

- `postgres.spec.ts` starts PostgreSQL in a container, migrates a table, writes an order event, and reads it back.
- `kafka.spec.ts` starts Kafka in a container, produces a message, and consumes it.
- `order-pipeline.spec.ts` starts Kafka and PostgreSQL together, consumes an order event from Kafka, and stores it in PostgreSQL.
- `ui/juice-shop.spec.ts` starts OWASP Juice Shop and checks storefront loading, search, navigation, feedback validation, invalid login handling, and new user registration.
- `mobile/ios-safari/juice-shop.spec.ts` drives iOS Safari through Appium and checks Juice Shop storefront and invalid login handling.
- `mobile/ios-native/settings.spec.ts` drives the iOS Settings app through Appium helpers, checks that the native app opens successfully, and toggles StandBy off and back on.
- `mobile/ios-native/settings-wdio.spec.ts` drives the iOS Settings app through WebDriverIO and checks the native smoke flow.

## Notes

The first full test run can take longer because the selected container runtime needs to download:

- `postgres:16-alpine`
- `confluentinc/cp-kafka:7.5.0`
- `bkimminich/juice-shop:v17.3.0`

If `npm run test:integration` fails with `Could not find a working container runtime strategy`, use a Docker-compatible runtime or switch to the Apple Containers flow above.
