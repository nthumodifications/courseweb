import { expect, test } from "bun:test";
import {
  LANGUAGE_PICKER_OPTIONS,
  localeFromBrowserLanguage,
  localizedLocation,
  localizedPath,
  localizedRoutePath,
} from "./locale";

test("browser Chinese tags select the matching UI locale", () => {
  expect(localeFromBrowserLanguage("zh-CN")).toBe("zh-cn");
  expect(localeFromBrowserLanguage("zh-SG")).toBe("zh-cn");
  expect(localeFromBrowserLanguage("zh-Hans-CN")).toBe("zh-cn");
  expect(localeFromBrowserLanguage("zh-TW")).toBe("zh");
  expect(localeFromBrowserLanguage("zh-HK")).toBe("zh");
  expect(localeFromBrowserLanguage("zh")).toBe("zh");
});

test("the language picker order and path switching keep the suffix", () => {
  expect(LANGUAGE_PICKER_OPTIONS).toEqual(["zh", "en", "zh-cn"]);
  expect(localizedPath("/zh-cn/courses", "en")).toBe("/en/courses");
});

test("route URLs keep zh-cn instead of collapsing to the content language", () => {
  expect(localizedRoutePath("zh-cn", "/proxy-login")).toBe(
    "/zh-cn/proxy-login",
  );
  expect(localizedRoutePath("zh-cn", "/timetable/share/share-1")).toBe(
    "/zh-cn/timetable/share/share-1",
  );
});

test("locale switching preserves search and hash", () => {
  expect(
    localizedLocation("/zh-cn/courses/123", "en", "?x=1&y=2", "#reviews"),
  ).toBe("/en/courses/123?x=1&y=2#reviews");
});
