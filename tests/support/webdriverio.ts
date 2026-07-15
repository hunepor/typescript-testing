import { remote } from "webdriverio";
import type { Options } from "@wdio/types";

const APPIUM_HOST = process.env.APPIUM_HOST ?? "127.0.0.1";
const APPIUM_PORT = Number(process.env.APPIUM_PORT ?? "4723");
const IOS_PLATFORM_VERSION = process.env.IOS_PLATFORM_VERSION ?? "26.5";
const IOS_DEVICE_NAME = process.env.IOS_DEVICE_NAME ?? "iPhone 17 Pro";
const IOS_NATIVE_APP_BUNDLE_ID = process.env.IOS_NATIVE_APP_BUNDLE_ID ?? "com.apple.Preferences";

export type WdioBrowser = Awaited<ReturnType<typeof remote>>;

export async function createIosNativeWdioSession(bundleId = IOS_NATIVE_APP_BUNDLE_ID): Promise<WdioBrowser> {
  return remote({
    protocol: "http",
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: "/",
    logLevel: (process.env.WDIO_LOG_LEVEL ?? "error") as Options.WebDriverLogTypes,
    transformRequest: (requestOptions) => {
      if (requestOptions.headers instanceof Headers) {
        // TODO: Re-check WebdriverIO releases after webdriverio/webdriverio#15357 lands in npm and remove this Node 26 workaround.
        requestOptions.headers.delete("content-length");
        requestOptions.headers.delete("Content-Length");
      }

      return requestOptions;
    },
    capabilities: {
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
