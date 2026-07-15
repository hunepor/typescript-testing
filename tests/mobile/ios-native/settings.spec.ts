import { expect, test } from "@playwright/test";

import { type AppiumNativeApp, createIosNativeAppSession, getIosNativeAppBundleId } from "../../support/appium.js";

test.describe("iOS native Settings", () => {
  test.setTimeout(90_000);

  test("opens the Settings app", async () => {
    const app = await createIosNativeAppSession();

    try {
      const source = await app.getSource();

      expect(source).toContain('name="Settings"');
      expect(source).toContain('name="General"');
      expect(getIosNativeAppBundleId()).toBe("com.apple.Preferences");
    } finally {
      await app.deleteSession();
    }
  });

  test("turns StandBy off and back on", async () => {
    const app = await createIosNativeAppSession();

    try {
      await openStandBySettings(app);
      await ensureStandByState(app, "1");

      await setStandByState(app, "0");
      await expectStandByState(app, "0");

      await setStandByState(app, "1");
      await expectStandByState(app, "1");
    } finally {
      await app.deleteSession();
    }
  });
});

async function openStandBySettings(app: AppiumNativeApp): Promise<void> {
  const source = await app.getSource();

  if (source.includes('name="AMBIENT_MODE_ENABLED"')) {
    return;
  }

  const standByCell = await app.findByAccessibilityId("StandBy");
  await standByCell.click();
  await expect.poll(async () => (await app.getSource()).includes('name="AMBIENT_MODE_ENABLED"')).toBe(true);
}

async function ensureStandByState(app: AppiumNativeApp, expectedValue: "0" | "1"): Promise<void> {
  if ((await getStandByState(app)) !== expectedValue) {
    await setStandByState(app, expectedValue);
  }
}

async function setStandByState(app: AppiumNativeApp, expectedValue: "0" | "1"): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if ((await getStandByState(app)) === expectedValue) {
      return;
    }

    const toggle = await app.findByXpath(
      '//XCUIElementTypeSwitch[@name="AMBIENT_MODE_ENABLED"]/XCUIElementTypeSwitch',
    );

    await toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 2_500));
  }

  expect(await getStandByState(app)).toBe(expectedValue);
}

async function expectStandByState(app: AppiumNativeApp, expectedValue: "0" | "1"): Promise<void> {
  await expect.poll(async () => getStandByState(app), { timeout: 15_000 }).toBe(expectedValue);
}

async function getStandByState(app: AppiumNativeApp): Promise<string | null> {
  const switchElement = await findStandBySwitch(app);

  return switchElement.getAttribute("value");
}

async function findStandBySwitch(app: AppiumNativeApp) {
  return app.findByIosPredicate("type == 'XCUIElementTypeSwitch' AND name == 'AMBIENT_MODE_ENABLED'");
}
