import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

const JUICE_SHOP_IMAGE = "bkimminich/juice-shop:v17.3.0";
const JUICE_SHOP_PORT = 3000;

export type TestUiApp = {
  getBaseUrl(): string;
  stop(): Promise<void>;
};

function isAppleContainersRuntime(): boolean {
  return process.env.TEST_RUNTIME === "apple-containers";
}

function createAppleUiApp(): TestUiApp {
  return {
    getBaseUrl: () => process.env.UI_APP_URL ?? `http://127.0.0.1:${process.env.JUICE_SHOP_PORT ?? "3000"}`,
    stop: async () => {
      // Apple Containers are managed by scripts/apple-containers/*-ui.sh in this mode.
    },
  };
}

function createTestcontainersUiApp(container: StartedTestContainer): TestUiApp {
  return {
    getBaseUrl: () => `http://${container.getHost()}:${container.getMappedPort(JUICE_SHOP_PORT)}`,
    stop: async () => {
      await container.stop();
    },
  };
}

export async function startUiApp(): Promise<TestUiApp> {
  if (isAppleContainersRuntime()) {
    return createAppleUiApp();
  }

  const container = await new GenericContainer(JUICE_SHOP_IMAGE)
    .withExposedPorts(JUICE_SHOP_PORT)
    .withWaitStrategy(Wait.forHttp("/", JUICE_SHOP_PORT).withStartupTimeout(120_000))
    .start();

  return createTestcontainersUiApp(container);
}
