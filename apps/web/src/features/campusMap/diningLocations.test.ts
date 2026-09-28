import { describe, expect, test } from "bun:test";
import type { CampusBuilding, CampusMapData } from "@courseweb/shared";
import type { DiningArea, DiningShop } from "../dining/types";
import {
  getCampusDiningLocation,
  getCampusDiningShops,
} from "./diningLocations";

const campus = (await Bun.file(
  new URL("../../../public/data/nthu-main-campus.json", import.meta.url),
).json()) as CampusMapData;

function shop(name: string, area: string): DiningShop {
  return {
    name,
    area,
    image: "",
    schedule: { weekday: "", saturday: "", sunday: "" },
  };
}

describe("map places and floors", () => {
  test("connects all existing dining footprints using source IDs", () => {
    const expected = new Map([
      [158391363, "food-court"],
      [749979081, "food-court"],
      [158364457, "shui-mu"],
      [138080029, "feng-yun"],
    ]);
    for (const [sourceId, location] of expected) {
      const building = campus.buildings.find((b) => b.source.id === sourceId)!;
      expect(building).toBeDefined();
      expect(getCampusDiningLocation(building)).toBe(location);
      expect(
        getCampusDiningLocation({
          ...building,
          names: { zh: "Renamed building" },
        }),
      ).toBe(location);
    }
  });

  test("does not attach shops to unrelated buildings or outdoor features", () => {
    expect(
      getCampusDiningLocation(
        campus.buildings.find((b) => b.identityId === "delta")!,
      ),
    ).toBeUndefined();
    expect(getCampusDiningLocation(campus.water[0])).toBeUndefined();
    const renamed: CampusBuilding = {
      ...campus.buildings[0],
      source: { type: "way", id: 1 },
      names: { zh: "水木生活中心" },
    };
    expect(getCampusDiningLocation(renamed)).toBeUndefined();
  });

  test("never shows a floor for the single-storey Food Court", () => {
    const data: DiningArea[] = [
      {
        building: "小吃部",
        restaurants: [shop("麥當勞", "小吃部"), shop("7-ELEVEN", "小吃部1樓")],
      },
    ];
    const result = getCampusDiningShops(data, "food-court");
    expect(result.map((entry) => entry.shop.name)).toEqual([
      "麥當勞",
      "7-ELEVEN",
    ]);
    expect(result.every((entry) => entry.floor === undefined)).toBe(true);
  });

  test("matches a shop's location rather than a misleading name or contact heading", () => {
    const data: DiningArea[] = [
      {
        building: "水木生活中心(商場聯絡窗口已更新)",
        restaurants: [
          shop("胖達咖啡", "水木生活中心2樓"),
          shop("全家便利商店", "水木生活中心1樓"),
        ],
      },
      {
        building: "風雲樓",
        restaurants: [
          shop("水木書苑", "風雲1樓"),
          shop("Touch Cafe", "風雲2樓"),
        ],
      },
    ];
    expect(
      getCampusDiningShops(data, "shui-mu").map(({ shop, floor }) => [
        shop.name,
        floor,
      ]),
    ).toEqual([
      ["全家便利商店", 1],
      ["胖達咖啡", 2],
    ]);
    expect(
      getCampusDiningShops(data, "feng-yun").map(({ shop, floor }) => [
        shop.name,
        floor,
      ]),
    ).toEqual([
      ["水木書苑", 1],
      ["Touch Cafe", 2],
    ]);
  });

  test("sorts floors numerically, preserves each floor's order, and leaves unknown floors blank", () => {
    const data: DiningArea[] = [
      {
        building: "風雲樓",
        restaurants: [
          shop("A", "風雲10樓"),
          shop("B", "風雲樓2樓"),
          shop("C", " 風雲2樓 "),
          shop("D", "風雲樓"),
          shop("Other", "風雲旁邊"),
        ],
      },
    ];
    expect(
      getCampusDiningShops(data, "feng-yun").map(({ shop, floor }) => [
        shop.name,
        floor,
      ]),
    ).toEqual([
      ["B", 2],
      ["C", 2],
      ["A", 10],
      ["D", undefined],
    ]);
  });

  test("reflects shop replacements and floor changes from refreshed API data", () => {
    const before: DiningArea[] = [
      {
        building: "風雲樓",
        restaurants: [
          shop("Previous tenant", "風雲2樓"),
          shop("Existing tenant", "風雲3樓"),
        ],
      },
    ];
    const after: DiningArea[] = [
      {
        building: "風雲樓",
        restaurants: [
          shop("New tenant", "風雲2樓"),
          shop("Existing tenant", "風雲4樓"),
        ],
      },
    ];
    expect(
      getCampusDiningShops(before, "feng-yun").map(({ shop }) => shop.name),
    ).toEqual(["Previous tenant", "Existing tenant"]);
    expect(
      getCampusDiningShops(after, "feng-yun").map(({ shop, floor }) => [
        shop.name,
        floor,
      ]),
    ).toEqual([
      ["New tenant", 2],
      ["Existing tenant", 4],
    ]);
  });

  test("returns an empty list when the location has no supplied shops", () => {
    expect(getCampusDiningShops([], "shui-mu")).toEqual([]);
  });
});
