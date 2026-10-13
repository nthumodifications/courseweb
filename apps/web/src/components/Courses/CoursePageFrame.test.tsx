import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";
import { installTestDom } from "@/testDom";
import { CoursePageContent } from "./CoursePageFrame";

const forbiddenAncestorClass =
  /(?:^|\s)(?:opacity-\S+|animate-\S+|text-muted-foreground)(?:\s|$)/;

const ancestorState = (heading: HTMLElement, root: HTMLElement) => {
  const ancestors: { className: string; opacity: string }[] = [];
  for (
    let element = heading.parentElement;
    element && element !== root;
    element = element.parentElement
  ) {
    ancestors.push({
      className: element.className,
      opacity: element.style.opacity,
    });
  }
  return ancestors;
};

describe("course page dialog content", () => {
  let active: ReturnType<typeof installTestDom> | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    active?.restore();
    active = undefined;
  });

  test.each([
    ["dialog", true],
    ["full page", false],
  ] as const)(
    "keeps %s ancestry comparable to the full page",
    async (_, inDialog) => {
      active = installTestDom("/zh/courses/instructor/%E7%8E%8B");
      const container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      await act(async () => {
        root?.render(
          createElement(
            CoursePageContent,
            { inDialog },
            createElement("h1", null, "王嬿婷"),
          ),
        );
      });

      const heading = container.querySelector("h1");
      expect(heading).not.toBeNull();
      const ancestors = ancestorState(heading!, container);
      expect(
        ancestors.some(({ className }) =>
          forbiddenAncestorClass.test(className),
        ),
      ).toBe(false);
      if (inDialog) {
        expect(ancestors.some(({ opacity }) => opacity !== "")).toBe(false);
      } else {
        expect(ancestors.some(({ opacity }) => opacity !== "")).toBe(true);
      }
    },
  );
});
