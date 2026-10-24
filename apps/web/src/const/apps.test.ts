import { describe, expect, test } from "bun:test";
import { apps, categories } from "./apps";
import en from "../dictionaries/en.json";
import zh from "../dictionaries/zh.json";
import zhHans from "../dictionaries/zh-hans.json";

const locales = [
  ["en", en],
  ["zh", zh],
  ["zh-hans", zhHans],
] as const;

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
      facilities: ["sports-venues", "library", "laundry", "announcements"],
      services: ["shops"],
      links: ["clubs_info", "chumei", "scholarship"],
    });

    expect(
      Object.values(appIdsByCategory).every((appIds) => appIds.length <= 6),
    ).toBe(true);
  });

  test.each(locales)(
    "%s has labels for every app and category",
    (locale, dictionary) => {
      const appLabels = dictionary.applist.apps as Record<string, unknown>;
      const categoryLabels = dictionary.applist.categories as Record<
        string,
        unknown
      >;

      for (const app of apps) {
        const label = appLabels[app.id];
        expect(
          typeof label === "string" && label.trim() !== "",
          `${locale}: missing app label for ${app.id}`,
        ).toBe(true);
      }

      for (const category of categories) {
        const label = categoryLabels[category];
        expect(
          typeof label === "string" && label.trim() !== "",
          `${locale}: missing category label for ${category}`,
        ).toBe(true);
      }
    },
  );
});
