const APPIUM_HOST = process.env.APPIUM_HOST ?? "127.0.0.1";
const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? "4723");
const IOS_PLATFORM_VERSION = process.env.IOS_PLATFORM_VERSION ?? "26.5";
const IOS_DEVICE_NAME = process.env.IOS_DEVICE_NAME ?? "iPhone 17 Pro";
const APPIUM_WEBVIEW_CONNECT_TIMEOUT = Number(process.env.APPIUM_WEBVIEW_CONNECT_TIMEOUT ?? "30000");
const IOS_NATIVE_APP_BUNDLE_ID = process.env.IOS_NATIVE_APP_BUNDLE_ID ?? "com.apple.Preferences";
const MOBILE_APP_URL = process.env.MOBILE_APP_URL ?? process.env.UI_APP_URL ?? "http://127.0.0.1:3000";

const ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";

type WebDriverResponse<T> = {
  value: T;
};

type WebDriverError = {
  value?: {
    error?: string;
    message?: string;
    stacktrace?: string;
  };
};

type ElementReference = {
  [ELEMENT_KEY]: string;
};

type FindStrategy = "accessibility id" | "-ios predicate string" | "css selector" | "xpath";

type AppiumCapabilities = {
  alwaysMatch: Record<string, unknown>;
};

export type AppiumClient = {
  url(url: string): Promise<void>;
  getTitle(): Promise<string>;
  getSource(): Promise<string>;
  findByAccessibilityId(selector: string): Promise<AppiumElement>;
  findByCss(selector: string): Promise<AppiumElement>;
  findByIosPredicate(predicate: string): Promise<AppiumElement>;
  findByXpath(selector: string): Promise<AppiumElement>;
  waitForText(text: string, timeout?: number): Promise<void>;
  deleteSession(): Promise<void>;
};

export type AppiumBrowser = AppiumClient;
export type AppiumNativeApp = AppiumClient;

export type AppiumElement = {
  click(): Promise<void>;
  setValue(value: string): Promise<void>;
  getAttribute(name: string): Promise<string | null>;
  isDisplayed(): Promise<boolean>;
};

export async function createIosSafariSession(): Promise<AppiumBrowser> {
  return createAppiumSession({
    alwaysMatch: {
      platformName: "iOS",
      browserName: "Safari",
      "appium:automationName": "XCUITest",
      "appium:deviceName": IOS_DEVICE_NAME,
      "appium:platformVersion": IOS_PLATFORM_VERSION,
      "appium:newCommandTimeout": 120,
      "appium:safariAllowPopups": true,
      "appium:webviewConnectTimeout": APPIUM_WEBVIEW_CONNECT_TIMEOUT,
      "appium:showXcodeLog": process.env.APPIUM_SHOW_XCODE_LOG === "true",
    },
  });
}

export async function createIosNativeAppSession(bundleId = IOS_NATIVE_APP_BUNDLE_ID): Promise<AppiumNativeApp> {
  return createAppiumSession({
    alwaysMatch: {
      platformName: "iOS",
      "appium:automationName": "XCUITest",
      "appium:deviceName": IOS_DEVICE_NAME,
      "appium:platformVersion": IOS_PLATFORM_VERSION,
      "appium:bundleId": bundleId,
      "appium:newCommandTimeout": 120,
      "appium:noReset": false,
      "appium:showXcodeLog": process.env.APPIUM_SHOW_XCODE_LOG === "true",
    },
  });
}

export function getIosNativeAppBundleId(): string {
  return IOS_NATIVE_APP_BUNDLE_ID;
}

export function getMobileAppUrl(): string {
  return MOBILE_APP_URL;
}

export async function waitForText(browser: AppiumClient, text: string, timeout = 15_000): Promise<void> {
  const deadline = Date.now() + timeout;
  const xpath = `//*[contains(normalize-space(.), ${xpathLiteral(text)})]`;

  while (Date.now() < deadline) {
    try {
      const element = await browser.findByXpath(xpath);

      if (await element.isDisplayed()) {
        return;
      }
    } catch (error) {
      if (!isNoSuchElementError(error)) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Expected to see text in iOS Appium session: ${text}`);
}

async function createAppiumSession(capabilities: AppiumCapabilities): Promise<AppiumClient> {
  const baseUrl = `http://${APPIUM_HOST}:${APPIUM_PORT}`;
  const response = await request<{ sessionId: string }>(baseUrl, "/session", {
    method: "POST",
    body: { capabilities },
  });

  const sessionId = response.sessionId;

  async function sessionRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>(baseUrl, `/session/${sessionId}${path}`, options);
  }

  async function findElement(using: FindStrategy, value: string): Promise<AppiumElement> {
    const element = await sessionRequest<ElementReference>("/element", {
      method: "POST",
      body: { using, value },
    });

    const elementId = element[ELEMENT_KEY];

    return {
      click: () => sessionRequest(`/element/${elementId}/click`, { method: "POST" }),
      setValue: (text) =>
        sessionRequest(`/element/${elementId}/value`, {
          method: "POST",
          body: { text, value: [...text] },
        }),
      getAttribute: (name) => sessionRequest<string | null>(`/element/${elementId}/attribute/${name}`),
      isDisplayed: () => sessionRequest<boolean>(`/element/${elementId}/displayed`),
    };
  }

  const browser: AppiumClient = {
    url: (url) => sessionRequest("/url", { method: "POST", body: { url } }),
    getTitle: () => sessionRequest<string>("/title"),
    getSource: () => sessionRequest<string>("/source"),
    findByAccessibilityId: (selector) => findElement("accessibility id", selector),
    findByCss: (selector) => findElement("css selector", selector),
    findByIosPredicate: (predicate) => findElement("-ios predicate string", predicate),
    findByXpath: (selector) => findElement("xpath", selector),
    waitForText: (text, timeout) => waitForText(browser, text, timeout),
    deleteSession: () => request(baseUrl, `/session/${sessionId}`, { method: "DELETE" }),
  };

  return browser;
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
};

async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => undefined)) as WebDriverResponse<T> | WebDriverError | undefined;

  if (!response.ok) {
    const error = payload as WebDriverError | undefined;
    const message = error?.value?.message ?? response.statusText;
    const code = error?.value?.error ?? response.status;

    throw new Error(`Appium request failed (${code}): ${message}`);
  }

  return (payload as WebDriverResponse<T>).value;
}

function isNoSuchElementError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("no such element");
}

function xpathLiteral(text: string): string {
  if (!text.includes("'")) {
    return `'${text}'`;
  }

  if (!text.includes('"')) {
    return `"${text}"`;
  }

  return `concat(${text
    .split("'")
    .map((part) => `'${part}'`)
    .join(`, "'", `)})`;
}
