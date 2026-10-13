import { describe, expect, test } from "bun:test";
import { removeFavourite, toggleFavourite } from "./favourites";

describe("favourite updates", () => {
  test("changes only the requested id from the previous list", () => {
    expect(toggleFavourite(["course-a", "course-b"], "course-c")).toEqual([
      "course-a",
      "course-b",
      "course-c",
    ]);
    expect(toggleFavourite(["course-a", "course-b"], "course-a")).toEqual([
      "course-b",
    ]);
    expect(removeFavourite(["course-a", "course-b"], "course-a")).toEqual([
      "course-b",
    ]);
  });
});
