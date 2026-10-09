import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const busPage = readFileSync(
  new URL("../bus/page.tsx", import.meta.url),
  "utf8",
);
const youBikePage = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8",
);

function tabTriggerClasses(source: string): string[] {
  return [...source.matchAll(/<TabsTrigger className="([^"]+)"/g)].map(
    ([, classes]) => classes,
  );
}

describe("mobile Bus and YouBike layout contracts", () => {
  test("keeps every page tab reachable by horizontal scrolling", () => {
    for (const source of [busPage, youBikePage]) {
      expect(source).toMatch(/<TabsList className="[^"]*overflow-x-auto[^"]*"/);
      expect(
        tabTriggerClasses(source).every((classes) =>
          classes.split(" ").includes("shrink-0"),
        ),
      ).toBe(true);
    }
  });

  test("gives YouBike station names the flexible column", () => {
    expect(youBikePage).toMatch(
      /<div className="[^"]*flex-1[^"]*min-w-0[^"]*">\s*<a/,
    );
    expect(youBikePage).toContain('className="sm:hidden"');
    expect(youBikePage).toContain('className="hidden sm:inline"');
  });
});
