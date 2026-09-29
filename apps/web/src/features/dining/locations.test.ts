import { describe, expect, test } from "bun:test";
import type { CampusMapData } from "@courseweb/shared";
import { getDiningLocationForArea, getDiningMapHref } from "./locations";
import {
  getCampusDiningLocation,
  getCampusDiningShops,
} from "../campusMap/diningLocations";

const campus = (await Bun.file(
  new URL("../../../public/data/nthu-main-campus.json", import.meta.url),
).json()) as CampusMapData;

describe("shop links to campus buildings", () => {
  test("every supported shop area opens an existing building with the same places list", () => {
    const examples = [
      ["小吃部", "小吃部"],
      ["水木生活中心2樓", "水木生活中心"],
      ["風雲1樓", "風雲樓"],
      ["旺宏館一樓", "旺宏館(學習資源中心)"],
      ["人社院", "人文社會學院"],
      ["第二招待所一樓", "第二招待所"],
      ["綜四館一樓", "第四綜合大樓"],
    ];
    for (const [area, name] of examples) {
      const href = getDiningMapHref("zh", area)!;
      expect(href).toStartWith("/zh/map?");
      const id = new URL(href, "https://nthumods.com").searchParams.get(
        "feature",
      );
      const building = campus.buildings.find((building) => building.id === id)!;
      expect(building?.names.zh).toBe(name);
      const location = getCampusDiningLocation(building)!;
      const shop = {
        name: "New shop from API",
        area,
        image: "",
        schedule: { weekday: "", saturday: "", sunday: "" },
      };
      expect(
        getCampusDiningShops(
          [{ building: "Updated API heading", restaurants: [shop] }],
          location,
        )[0]?.shop,
      ).toEqual(shop);
    }
  });

  test("retains the current language and resolves floors without relying on shop names", () => {
    expect(getDiningMapHref("en", " 風雲樓2樓 ")).toBe(
      "/en/map?feature=osm-way-138080029-0",
    );
    expect(getDiningMapHref(undefined, "小吃部")).toBe(
      "/zh/map?feature=osm-way-158391363-0",
    );
    expect(getDiningLocationForArea("水木生活中心二樓")).toEqual({
      location: "shui-mu",
      floor: 2,
    });
    expect(getDiningLocationForArea("旺宏館一樓")).toEqual({
      location: "mxic",
      floor: 1,
    });
    expect(getDiningLocationForArea("風雲十一樓")?.floor).toBe(11);
    expect(getDiningLocationForArea("小吃部1樓")?.floor).toBeUndefined();
  });

  test("never routes the Nanda building or unknown places to a similar main-campus building", () => {
    for (const area of [
      "綜合教學大樓",
      "綜合教學大樓(南大校區)",
      "其他餐廳",
      "風雲旁邊",
      "",
    ]) {
      expect(getDiningMapHref("zh", area)).toBeUndefined();
    }
  });
});
