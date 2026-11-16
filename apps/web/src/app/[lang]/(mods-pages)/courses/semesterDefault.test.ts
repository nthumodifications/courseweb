import { describe, expect, test } from "bun:test";
import { shouldDefaultSemester } from "./semesterDefault";

describe("semester defaulting", () => {
  test("does not replace an explicit semester while its facet item is absent", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        refinedSemester: undefined,
        hasExplicitSemester: true,
        hasUserSelectedSemester: false,
        lastDefaultedSemester: undefined,
        defaultSemester: "11510",
      }),
    ).toBe(false);
  });

  test("does not replace a user choice before the URL catches up", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        refinedSemester: undefined,
        hasExplicitSemester: false,
        hasUserSelectedSemester: true,
        lastDefaultedSemester: undefined,
        defaultSemester: "11510",
      }),
    ).toBe(false);
  });

  test("defaults once when neither the URL nor the user chose a semester", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: false,
        refinedSemester: undefined,
        hasExplicitSemester: false,
        hasUserSelectedSemester: false,
        lastDefaultedSemester: undefined,
        defaultSemester: "11510",
      }),
    ).toBe(true);
  });

  test("updates its own previous default when the calendar default changes", () => {
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: true,
        refinedSemester: "11510",
        hasExplicitSemester: false,
        hasUserSelectedSemester: false,
        lastDefaultedSemester: "11510",
        defaultSemester: "11520",
      }),
    ).toBe(true);
    expect(
      shouldDefaultSemester({
        canRefine: true,
        hasRefinedItem: true,
        refinedSemester: "11420",
        hasExplicitSemester: false,
        hasUserSelectedSemester: false,
        lastDefaultedSemester: "11510",
        defaultSemester: "11520",
      }),
    ).toBe(false);
  });
});
