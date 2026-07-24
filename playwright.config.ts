import { defineConfig } from "@playwright/test";

const integrationSpecPattern = /.*integration\/.*\.spec\.ts/;
const iosNativeSpecPattern = /.*mobile\/ios-native\/.*\.spec\.ts/;
const iosSafariSpecPattern = /.*mobile\/ios-safari\/.*\.spec\.ts/;
const registrationSpecPattern = /.*juice-shop-registration\.spec\.ts/;
const uiSpecPattern = /.*ui\/.*\.spec\.ts/;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 5,
  timeout: 10_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never" }], ["allure-playwright"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "integration",
      testMatch: integrationSpecPattern,
      workers: 1,
    },
    {
      name: "ui-registration",
      testMatch: registrationSpecPattern,
      workers: 1,
    },
    {
      name: "ui",
      testMatch: uiSpecPattern,
      testIgnore: registrationSpecPattern,
    },
    {
      name: "mobile-ios-safari",
      testMatch: iosSafariSpecPattern,
      workers: 1,
    },
    {
      name: "mobile-ios-native",
      testMatch: iosNativeSpecPattern,
      workers: 1,
    },
  ],
});
