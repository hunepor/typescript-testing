import { expect, test, type Page } from "@playwright/test";
import { startUiApp, type TestUiApp } from "../support/ui-app.js";

let app: TestUiApp | undefined;

type JuiceShopReview = {
  message: string;
  author: string;
  product: number;
  likesCount: number;
  likedBy: unknown[];
  _id: string;
  liked: boolean;
};

type JuiceShopReviewsResponse = {
  status: string;
  data: JuiceShopReview[];
};

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

async function openJuiceShop(page: Page): Promise<void> {
  await page.goto(getBaseUrl());
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

async function mockAppleJuiceReviews(page: Page, reviewText: string): Promise<() => string | undefined> {
  let requestedProductId: string | undefined;

  await page.route("**/rest/products/*/reviews", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathParts = requestUrl.pathname.split("/");

    requestedProductId = pathParts.at(-2);

    expect(request.method()).toBe("GET");
    expect(requestUrl.pathname).toBe("/rest/products/1/reviews");
    expect(requestedProductId).toBe("1");
    expect(request.postData()).toBeNull();

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: [
          {
            message: reviewText,
            author: "admin@juice-sh.op",
            product: 1,
            likesCount: 0,
            likedBy: [],
            _id: "3rcmG5Z99uekhbMBF",
            liked: true,
          },
        ],
      }),
    });
  });

  return () => requestedProductId;
}

async function partiallyMockAppleJuiceReviews(
  page: Page,
  reviewText: string,
): Promise<{
  getOriginalReviewText: () => string | undefined;
  getRequestedProductId: () => string | undefined;
}> {
  let originalReviewText: string | undefined;
  let requestedProductId: string | undefined;

  await page.route("**/rest/products/*/reviews", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const pathParts = requestUrl.pathname.split("/");

    requestedProductId = pathParts.at(-2);

    expect(request.method()).toBe("GET");
    expect(requestUrl.pathname).toBe("/rest/products/1/reviews");
    expect(requestedProductId).toBe("1");
    expect(request.postData()).toBeNull();

    const response = await route.fetch();
    const responseJson = (await response.json()) as JuiceShopReviewsResponse;

    originalReviewText = responseJson.data[0]?.message;

    await route.fulfill({
      response,
      contentType: "application/json",
      body: JSON.stringify({
        ...responseJson,
        data: responseJson.data.map((review, index) =>
          index === 0
            ? {
                ...review,
                message: reviewText,
              }
            : review,
        ),
      }),
    });
  });

  return {
    getOriginalReviewText: () => originalReviewText,
    getRequestedProductId: () => requestedProductId,
  };
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
  await page.goto(`${getBaseUrl()}/#/contact`);
  await closeOptionalDialogs(page);

  await page.getByLabel("Field for entering the comment or the feedback").fill("Great catalog and smooth checkout.");
  await page.getByLabel("Field for the result of the CAPTCHA code").fill("999");

  await expect(page.getByLabel("Button to send the review")).toBeDisabled();
});

test("shows an error for invalid login", async ({ page }) => {
  await page.goto(`${getBaseUrl()}/#/login`);
  await closeOptionalDialogs(page);

  await page.getByLabel("Text field for the login email").fill("not-a-user@example.test");
  await page.getByLabel("Text field for the login password").fill("wrong-password");
  await page.getByLabel("Login", { exact: true }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("apple juice description", async ({ page }) => {
  const mockedReviewText = "One of my most loved!";
  const getRequestedProductId = await mockAppleJuiceReviews(page, mockedReviewText);

  await page.goto(getBaseUrl());
  await page.getByRole("button", { name: "Close Welcome Banner" }).click();
  await page.getByRole("button", { name: "Apple Juice (1000ml)" }).click();
  await expect(page.locator("mat-dialog-content")).toContainText("The all-time classic.");
  await expect(page.getByRole("heading")).toContainText("Apple Juice (1000ml)");

  await expect(page.locator("mat-dialog-content")).toMatchAriaSnapshot(`
    - img "Apple Juice (1000ml)"
    - heading "Apple Juice (1000ml)" [level=1]
    - text: The all-time classic.
    - paragraph: /\\d+\\.\\d+¤/
    - separator
    - button
    - button "Reviews (1)"
    - separator
    - button "Close Dialog"
    `);
  await page.getByRole("button", { name: "Reviews (1)" }).click();

  await expect(page.locator("mat-dialog-content")).toContainText(mockedReviewText);
  await expect(page.locator("mat-dialog-content")).not.toContainText("One of my most hated!");
  expect(getRequestedProductId()).toBe("1");

  await page.getByRole("button", { name: "Close Dialog" }).click();
});

test("captures apple juice reviews dialog screenshot", async ({ page }) => {
  const mockedReviewText = "One of my most loved!";

  await mockAppleJuiceReviews(page, mockedReviewText);
  await openJuiceShop(page);
  await page.getByRole("button", { name: "Apple Juice (1000ml)" }).click();
  await page.getByRole("button", { name: "Reviews (1)" }).click();

  const dialogContent = page.locator("mat-dialog-content");

  await expect(dialogContent).toContainText(mockedReviewText);
  await expect(dialogContent).toHaveScreenshot("apple-juice-reviews-dialog.png");

  await page.getByRole("button", { name: "Close Dialog" }).click();
});

test("partially mocks apple juice reviews response", async ({ page }) => {
  const patchedReviewText = "One of my most loved after partial mock!";
  const reviewsMock = await partiallyMockAppleJuiceReviews(page, patchedReviewText);

  await openJuiceShop(page);
  await page.getByRole("button", { name: "Apple Juice (1000ml)" }).click();
  await page.getByRole("button", { name: "Reviews (1)" }).click();

  const dialogContent = page.locator("mat-dialog-content");
  const originalReviewText = reviewsMock.getOriginalReviewText();

  await expect(dialogContent).toContainText(patchedReviewText);
  expect(originalReviewText).toBeTruthy();
  expect(originalReviewText).not.toBe(patchedReviewText);
  await expect(dialogContent).not.toContainText(originalReviewText as string);
  expect(reviewsMock.getRequestedProductId()).toBe("1");

  await page.getByRole("button", { name: "Close Dialog" }).click();
});
