import { describe, expect, test } from "bun:test";
import { shouldDefaultSemester } from "./semesterDefault";

describe("semester defaulting", () => {
  test("does not replace an explicit semester while its facet item is absent", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        hasExplicitSemester: true,
        hasUserSelectedSemester: false,
        hasDefaultedSemester: false,
      }),
    ).toBe(false);
  });

  test("does not replace a user choice before the URL catches up", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        hasExplicitSemester: false,
        hasUserSelectedSemester: true,
        hasDefaultedSemester: false,
      }),
    ).toBe(false);
  });

  test("defaults once when neither the URL nor the user chose a semester", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        hasExplicitSemester: false,
        hasUserSelectedSemester: false,
        hasDefaultedSemester: false,
      }),
    ).toBe(true);
  });

  test("does not apply the default again after the first visit", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        hasExplicitSemester: false,
        hasUserSelectedSemester: false,
        hasDefaultedSemester: true,
      }),
    ).toBe(false);
  });
});
