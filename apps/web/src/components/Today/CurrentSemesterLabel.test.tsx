import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  afterAll,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import en from "@/dictionaries/en.json";

const TEST_NOW = new Date("2026-10-09T12:00:00+08:00");
const actualShared = await import("@courseweb/shared");
const testSemester = actualShared.semesterInfo.find(
  (semester) => semester.id === "11510",
);
if (!testSemester) throw new Error("Missing semester fixture");
mock.module("@courseweb/shared", () => ({
  ...actualShared,
  currentSemester: testSemester,
}));
setSystemTime(TEST_NOW);
const { currentSemester } = await import("@courseweb/shared");
const { default: CurrentSemesterLabel } = await import(
  "./CurrentSemesterLabel"
);
setSystemTime();

afterAll(() => {
  mock.module("@courseweb/shared", () => actualShared);
});

const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "IS_REACT_ACT_ENVIRONMENT",
]);

describe("current semester label", () => {
  test("renders the current semester week number in an emulated browser", async () => {
    setSystemTime(TEST_NOW);
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<CurrentSemesterLabel language="en" dictionary={en} />);
      });

      const expected = currentSemester
        ? `AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${
            Math.floor(
              (Date.now() - currentSemester.begins.getTime()) /
                (1000 * 60 * 60 * 24 * 7),
            ) + 1
          }`
        : "Holiday";
      expect(container.textContent).toBe(expected);
    } finally {
      await act(async () => {
        root.unmount();
      });
      dom.window.close();
      restoreGlobals();
      setSystemTime();
    }
  });
});
