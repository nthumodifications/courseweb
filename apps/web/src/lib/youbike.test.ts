import { describe, expect, test } from "bun:test";
import {
  isNandaCampusStation,
  DEFAULT_PINNED_STATIONS,
  type YouBikeStation,
} from "./youbike";

describe("YouBike helpers", () => {
  test("isNandaCampusStation identifies Nanda campus stations", () => {
    const nandaStation: YouBikeStation = {
      id: "500401030",
      nameZh: "清華大學(南大校區)",
      nameEn: "National Tsing Hua University (Nanda Campus)",
      districtZh: "東區",
      districtEn: "East Dist",
      addressZh: "食品路227號",
      addressEn: "No. 227, Shipin Rd.",
      totalCapacity: 60,
      availableBikes: 35,
      regularBikes: 31,
      eBikes: 4,
      emptyDocks: 24,
      lat: 24.79429,
      lng: 120.96453,
      status: 1,
      updatedAt: "2026-10-07 23:00:00",
    };
    expect(isNandaCampusStation(nandaStation)).toBe(true);

    const mainStation: YouBikeStation = {
      id: "500401004",
      nameZh: "清華大學(小吃部)",
      nameEn: "National Tsing Hua University (Small Food Center)",
      districtZh: "東區",
      districtEn: "East Dist",
      addressZh: "光復路二段101號",
      addressEn: "No. 101, Sec. 2, Kuang-Fu Rd.",
      totalCapacity: 48,
      availableBikes: 1,
      regularBikes: 0,
      eBikes: 1,
      emptyDocks: 47,
      lat: 24.79307,
      lng: 120.99335,
      status: 1,
      updatedAt: "2026-10-07 23:00:00",
    };
    expect(isNandaCampusStation(mainStation)).toBe(false);
  });

  test("DEFAULT_PINNED_STATIONS includes key campus stations", () => {
    expect(DEFAULT_PINNED_STATIONS).toContain("500401008"); // 北校門
    expect(DEFAULT_PINNED_STATIONS).toContain("500401004"); // 小吃部
    expect(DEFAULT_PINNED_STATIONS).toContain("500401016"); // 台達館
    expect(DEFAULT_PINNED_STATIONS).toContain("500401030"); // 南大校區
    expect(DEFAULT_PINNED_STATIONS).toContain("500401053"); // 清大夜市
  });
});
