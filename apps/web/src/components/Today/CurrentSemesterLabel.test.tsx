import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { describe, expect, test } from "bun:test";
import { currentSemester } from "@courseweb/shared";
import CurrentSemesterLabel from "./CurrentSemesterLabel";

describe("current semester label", () => {
  test("renders the current semester week number in an emulated browser", async () => {
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

    await act(async () => {
      root.render(<CurrentSemesterLabel language="en" />);
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

    await act(async () => {
      root.unmount();
    });
    dom.window.close();
  });
});
