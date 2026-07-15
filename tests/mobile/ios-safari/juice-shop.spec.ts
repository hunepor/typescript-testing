import { expect, test } from "@playwright/test";
import { createIosSafariSession, getMobileAppUrl, waitForText } from "../../support/appium.js";

test.describe("iOS Safari Juice Shop smoke", () => {
  test("opens the storefront in iOS Safari", async () => {
    const browser = await createIosSafariSession();

    try {
      await browser.url(getMobileAppUrl());
      await waitForText(browser, "All Products");

      await expect.poll(() => browser.getTitle()).toContain("OWASP Juice Shop");
    } finally {
      await browser.deleteSession();
    }
  });

  test("shows invalid login error in iOS Safari", async () => {
    const browser = await createIosSafariSession();

    try {
      await browser.url(`${getMobileAppUrl()}/#/login`);
      await waitForText(browser, "Login");

      await (await browser.findByCss("#email")).setValue("not-a-user@example.test");
      await (await browser.findByCss("#password")).setValue("wrong-password");
      await (await browser.findByCss("#loginButton")).click();

      await waitForText(browser, "Invalid email or password.");
    } finally {
      await browser.deleteSession();
    }
  });
});
