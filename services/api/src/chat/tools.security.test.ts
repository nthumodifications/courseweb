import { describe, expect, it } from "bun:test";
import { validateToolArguments } from "./tools";

describe("chat tool argument guardrails", () => {
  it("rejects oversized strings and arrays before tool execution", () => {
    expect(() =>
      validateToolArguments("search_courses", { query: "x".repeat(201) }),
    ).toThrow("Invalid arguments for search_courses");

    expect(() =>
      validateToolArguments("check_timetable_conflicts", {
        courseIds: Array.from({ length: 16 }, (_, index) => `course-${index}`),
      }),
    ).toThrow("Invalid arguments for check_timetable_conflicts");

    expect(() =>
      validateToolArguments("get_bus_departures", { direction: "sideways" }),
    ).toThrow("Invalid arguments for get_bus_departures");
  });

  it("rejects extra arguments instead of passing them to a tool", () => {
    expect(() =>
      validateToolArguments("get_weather", { url: "https://attacker.example" }),
    ).toThrow("Invalid arguments for get_weather");
  });

  it("accepts the declared empty argument object", () => {
    expect(validateToolArguments("get_weather", {})).toEqual({});
  });
});
