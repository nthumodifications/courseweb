import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import { loadZhHans, useCachedDictionary } from "./dictionary-cache";

test("uses the cached Simplified dictionary on a fresh first render", async () => {
  await loadZhHans();
  const firstRenderValues: string[] = [];
  const Probe = () => {
    firstRenderValues.push(useCachedDictionary("zh", "hans").a11y.settings);
    return null;
  };

  renderToStaticMarkup(createElement(Probe));

  expect(firstRenderValues[0]).toBe("设置");
});
