import { expect, test, type Page } from "@playwright/test";
import { startUiApp, type TestUiApp } from "../support/ui-app.js";

let app: TestUiApp;

test.beforeAll(async () => {
  app = await startUiApp();
});

test.afterAll(async () => {
  await app.stop();
});

async function openJuiceShop(page: Page): Promise<void> {
  await page.goto(app.getBaseUrl());
  await closeOptionalDialogs(page);
}

async function closeOptionalDialogs(page: Page): Promise<void> {
  await page.getByLabel("Close Welcome Banner").click({ timeout: 5_000 }).catch(() => undefined);
  await page.getByLabel("dismiss cookie message").click({ timeout: 5_000 }).catch(() => undefined);
}

async function searchFor(page: Page, query: string): Promise<void> {
  await page.locator("mat-icon.mat-search_icon-search").click();
  await page.locator("input[type='text']:not([disabled])").fill(query);
  await page.keyboard.press("Enter");
}

function createRegistrationData(): { email: string; password: string; securityAnswer: string } {
  const uniqueId = Date.now().toString(36);

  return {
    email: `qa.registration.${uniqueId}@example.test`,
    password: createValidPassword(),
    securityAnswer: `answer-${uniqueId}`,
  };
}

function createValidPassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const allCharacters = lowercase + uppercase + digits + special;
  const characters = [
    pickRandomCharacter(lowercase),
    pickRandomCharacter(uppercase),
    pickRandomCharacter(digits),
    pickRandomCharacter(special),
  ];

  while (characters.length < 12) {
    characters.push(pickRandomCharacter(allCharacters));
  }

  return shuffleCharacters(characters).join("");
}

function pickRandomCharacter(characters: string): string {
  return characters[Math.floor(Math.random() * characters.length)];
}

function shuffleCharacters(characters: string[]): string[] {
  return characters
    .map((character) => ({ character, sortKey: Math.random() }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ character }) => character);
}

test("opens the Juice Shop storefront", async ({ page }) => {
  await openJuiceShop(page);

  await expect(page).toHaveTitle(/OWASP Juice Shop/);
  await expect(page.getByText("All Products")).toBeVisible();
});

test("filters products with search", async ({ page }) => {
  await openJuiceShop(page);

  await searchFor(page, "Apple");

  await expect(page.getByText("Search Results - Apple")).toBeVisible();
  await expect(page.getByText("Apple Juice")).toBeVisible();
  await expect(page.getByText("Banana Juice")).toBeHidden();
});

test("opens customer feedback from the side navigation", async ({ page }) => {
  await openJuiceShop(page);

  await page.getByLabel("Open Sidenav").click();
  await page.getByLabel("Go to contact us page").click();

  await expect(page).toHaveURL(/#\/contact/);
  await expect(page.getByRole("heading", { name: "Customer Feedback" })).toBeVisible();
  await expect(page.getByLabel("Field for entering the comment or the feedback")).toBeVisible();
});

test("keeps feedback submit disabled for incomplete captcha validation", async ({ page }) => {
  await page.goto(`${app.getBaseUrl()}/#/contact`);
  await closeOptionalDialogs(page);

  await page.getByLabel("Field for entering the comment or the feedback").fill("Great catalog and smooth checkout.");
  await page.getByLabel("Field for the result of the CAPTCHA code").fill("999");

  await expect(page.getByLabel("Button to send the review")).toBeDisabled();
});

test("shows an error for invalid login", async ({ page }) => {
  await page.goto(`${app.getBaseUrl()}/#/login`);
  await closeOptionalDialogs(page);

  await page.getByLabel("Text field for the login email").fill("not-a-user@example.test");
  await page.getByLabel("Text field for the login password").fill("wrong-password");
  await page.getByLabel("Login", { exact: true }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("registers a new customer account", async ({ page }) => {
  const user = createRegistrationData();

  await page.goto(`${app.getBaseUrl()}/#/register`);
  await closeOptionalDialogs(page);

  await page.getByLabel("Email address field").fill(user.email);
  await page.getByLabel("Field for the password").fill(user.password);
  await page.getByLabel("Field to confirm the password").fill(user.password);
  await page.getByLabel("Selection list for the security question").click();
  await page.getByRole("option", { name: "Your favorite book?" }).click();
  await page.getByLabel("Field for the answer to the security question").fill(user.securityAnswer);
  await page.getByLabel("Button to complete the registration").click();

  await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByText("Registration completed successfully. You can now log in.")).toBeVisible();
});
