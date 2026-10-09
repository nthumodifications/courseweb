import { describe, expect, test } from "bun:test";
import { apps, categories } from "./apps";

describe("app categories", () => {
  test("derives the stable category order and membership from app definitions", () => {
    const appIdsByCategory = Object.fromEntries(
      categories.map((category) => [
        category,
        apps.filter((app) => app.category === category).map((app) => app.id),
      ]),
    );

    expect(appIdsByCategory).toEqual({
      courses: ["courses", "modules", "chat", "venues", "timetable-community"],
      studies: ["calendar", "planner", "grades"],
      transport: ["campus-map", "bus", "youbike"],
      facilities: ["sports-venues", "library", "laundry"],
      services: ["shops"],
      links: ["clubs_info", "chumei", "scholarship"],
    });

    expect(
      Object.values(appIdsByCategory).every((appIds) => appIds.length <= 6),
    ).toBe(true);
  });
});
