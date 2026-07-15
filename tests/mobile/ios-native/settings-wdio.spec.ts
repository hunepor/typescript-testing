import { expect, test } from "@playwright/test";

import { type WdioBrowser, createIosNativeWdioSession } from "../../support/webdriverio.js";

const STANDBY_SWITCH_XPATH = '//XCUIElementTypeSwitch[@name="AMBIENT_MODE_ENABLED"]';
const STANDBY_INNER_SWITCH_XPATH = `${STANDBY_SWITCH_XPATH}/XCUIElementTypeSwitch`;

test.describe("iOS native Settings via WebdriverIO", () => {
  test.setTimeout(90_000);

  test("opens Settings through WebdriverIO v9", async () => {
    const driver = await createIosNativeWdioSession();

    try {
      const source = await driver.getPageSource();

      expect(source).toContain('name="Settings"');
      expect(source).toContain('name="General"');
    } finally {
      await driver.deleteSession();
    }
  });

  test("turns StandBy off and back on through WebdriverIO", async () => {
    const driver = await createIosNativeWdioSession();

    try {
      await openStandBySettings(driver);
      await ensureStandByState(driver, "1");

      await setStandByState(driver, "0");
      await expectStandByState(driver, "0");

      await setStandByState(driver, "1");
      await expectStandByState(driver, "1");
    } finally {
      await driver.deleteSession();
    }
  });

});

async function openStandBySettings(driver: WdioBrowser): Promise<void> {
  const source = await driver.getPageSource();

  if (source.includes('name="AMBIENT_MODE_ENABLED"')) {
    return;
  }

  await driver.$("~StandBy").tap();
  await expect.poll(async () => (await driver.getPageSource()).includes('name="AMBIENT_MODE_ENABLED"')).toBe(true);
}

async function ensureStandByState(driver: WdioBrowser, expectedValue: "0" | "1"): Promise<void> {
  if ((await getStandByState(driver)) !== expectedValue) {
    await setStandByState(driver, expectedValue);
  }
}

async function setStandByState(driver: WdioBrowser, expectedValue: "0" | "1"): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if ((await getStandByState(driver)) === expectedValue) {
      return;
    }

    await driver.$(STANDBY_INNER_SWITCH_XPATH).tap();
    await driver.pause(2_500);
  }

  expect(await getStandByState(driver)).toBe(expectedValue);
}

async function expectStandByState(driver: WdioBrowser, expectedValue: "0" | "1"): Promise<void> {
  await expect.poll(async () => getStandByState(driver), { timeout: 15_000 }).toBe(expectedValue);
}

async function getStandByState(driver: WdioBrowser): Promise<string | null> {
  return driver.$(STANDBY_SWITCH_XPATH).getAttribute("value");
}
