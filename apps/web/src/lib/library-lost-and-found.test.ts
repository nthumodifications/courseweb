import { describe, expect, test } from "bun:test";
import {
  filterLostAndFoundItems,
  getLostAndFoundTypes,
} from "./library-lost-and-found-core";
import type { LostAndFoundItem } from "./library-lost-and-found";

const items: LostAndFoundItem[] = [
  {
    id: "1",
    date: "2026-10-22",
    location: "總圖 1F",
    description: "其它卡片 白色 悠遊卡",
    type: "其它卡片",
  },
  {
    id: "2",
    date: "2026-10-21",
    location: "總圖 5F",
    description: "水壺 深灰色",
    type: "水壺",
  },
];

describe("lost-and-found filters", () => {
  test("lists unique types and filters by type or date text", () => {
    expect(getLostAndFoundTypes(items)).toEqual(["其它卡片", "水壺"]);
    expect(filterLostAndFoundItems(items, "水壺", "")).toEqual([items[1]]);
    expect(filterLostAndFoundItems(items, "all", "2026-10-22")).toEqual([
      items[0],
    ]);
  });
});
