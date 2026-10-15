import { createElement, Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import { loadZhCnAssets, useCachedDictionary } from "./dictionary-cache";

test("uses the cached Simplified dictionary on a fresh first render", async () => {
  const firstRenderValues: string[] = [];
  const Probe = () => {
    const value = useCachedDictionary("zh-cn").a11y.settings;
    firstRenderValues.push(value);
    return createElement("span", null, value);
  };

  const firstMarkup = renderToStaticMarkup(
    createElement(
      Suspense,
      { fallback: createElement("span", null, "Loading") },
      createElement(Probe),
    ),
  );

  expect(firstMarkup).not.toContain("設定");
  expect(
    firstMarkup.includes("Loading") || firstRenderValues[0] === "设置",
  ).toBe(true);

  await loadZhCnAssets();
  expect(renderToStaticMarkup(createElement(Probe))).toContain("设置");
});
