import { expect, test } from "bun:test";
import { loadZhConverters } from "./zhConverter";

test("uses phrase-aware conversion for app-authored zh-cn copy", async () => {
  const { authored } = await loadZhConverters();

  expect(authored("設定 | NTHUMods")).toBe("设置 | NTHUMods");
  expect(authored("挑選常搭路線，把「我的公車」放在最上方…")).toBe(
    "挑选常搭路线，把「我的公车」放在最上方…",
  );
});

test("uses character-only conversion for API/proper-name data", async () => {
  const { characters } = await loadZhConverters();

  expect(characters("計算機程式設計一")).toBe("计算机程式设计一");
  expect(characters("清華大學(小吃部)")).toBe("清华大学(小吃部)");
  expect(characters("计算机")).toBe("计算机");
});
