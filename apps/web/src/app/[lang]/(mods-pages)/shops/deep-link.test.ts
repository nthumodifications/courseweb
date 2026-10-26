import { describe, expect, test } from "bun:test";
import areas from "./areas.json";
import { resolveShopAreaDeepLink } from "./deep-link";

describe("resolveShopAreaDeepLink", () => {
  test.each([
    ["area=風雲2樓", { area: "風雲2樓" }],
    ["building=小吃部", { area: "小吃部" }],
    ["building=風雲1", { area: "風雲1樓" }],
    [
      "building=風雲",
      { area: "", areas: ["風雲1樓", "風雲2樓", "風雲3樓", "風雲4樓"] },
    ],
    [
      "building=%20%E6%B0%B4%E6%9C%A8%20",
      { area: "", areas: ["水木生活中心1樓", "水木生活中心2樓"] },
    ],
    ["building=unknown", { area: "" }],
    ["area=toString", { area: "" }],
    ["building=__proto__", { area: "" }],
    ["area=風雲1樓%20", { area: "" }],
    ["area=風雲1樓&area=風雲2樓", { area: "" }],
    ["building=風雲&building=小吃部", { area: "" }],
    ["", { area: "" }],
  ])("resolves %s", (query, expected) => {
    expect(resolveShopAreaDeepLink(new URLSearchParams(query), areas)).toEqual(
      expected,
    );
  });
});
