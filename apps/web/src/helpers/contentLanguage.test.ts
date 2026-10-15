import { expect, test } from "bun:test";
import {
  contentLanguage,
  resolveTimetableContentLanguage,
} from "./contentLanguage";

test("maps the Simplified Chinese UI locale to Chinese content", () => {
  expect(contentLanguage("zh-cn")).toBe("zh");
  expect(contentLanguage("zh")).toBe("zh");
  expect(contentLanguage("en")).toBe("en");
});

test("timetable app preference follows the UI locale content language", () => {
  expect(resolveTimetableContentLanguage("app", "zh-cn")).toBe("zh");
  expect(resolveTimetableContentLanguage("app", "zh")).toBe("zh");
  expect(resolveTimetableContentLanguage("app", "en")).toBe("en");
  expect(resolveTimetableContentLanguage("en", "zh-cn")).toBe("en");
});
