import { expect, test, type Page } from "@playwright/test";
import { startUiApp, type TestUiApp } from "../support/ui-app.js";

let app: TestUiApp | undefined;

test.beforeAll(async () => {
  app = await startUiApp();
});

test.afterAll(async () => {
  await app?.stop();
});

function getBaseUrl(): string {
  if (!app) {
    throw new Error("Juice Shop test app was not started");
  }

  return app.getBaseUrl();
}

async function closeOptionalDialogs(page: Page): Promise<void> {
  await page.getByLabel("Close Welcome Banner").click({ timeout: 5_000 }).catch(() => undefined);
  await page.getByLabel("dismiss cookie message").click({ timeout: 5_000 }).catch(() => undefined);
}

function createRegistrationData(): { email: string; password: string; securityAnswer: string } {
  const uniqueId = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`;

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

async function chooseSecurityQuestion(page: Page, question: string): Promise<void> {
  const securityQuestion = page.getByLabel("Selection list for the security question");
  const option = page.getByRole("option", { name: question });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await securityQuestion.click();

    if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await option.click();
      return;
    }
  }

  await option.click();
}

test("registers a new customer account", async ({ page }) => {
  test.setTimeout(60_000);

  const user = createRegistrationData();
  const securityQuestionsResponse = page.waitForResponse(
    (response) => response.url().includes("/api/SecurityQuestions/") && response.ok(),
  );

  await page.goto(`${getBaseUrl()}/#/register`);
  await closeOptionalDialogs(page);
  await securityQuestionsResponse;

  await page.getByLabel("Email address field").fill(user.email);
  await page.getByLabel("Field for the password").fill(user.password);
  await page.getByLabel("Field to confirm the password").fill(user.password);
  await chooseSecurityQuestion(page, "Your favorite book?");
  await page.getByLabel("Field for the answer to the security question").fill(user.securityAnswer);
  await page.getByLabel("Button to complete the registration").click();

  await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByText("Registration completed successfully. You can now log in.")).toBeVisible();
});
