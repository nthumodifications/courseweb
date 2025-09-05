import { deepCompare, stripNullValues } from "./deepCompare";
import { describe, it, expect } from "bun:test";

describe("deepCompare", () => {
  it("should return true for identical primitive values", () => {
    expect(deepCompare(1, 1)).toBe(true);
    expect(deepCompare("test", "test")).toBe(true);
    expect(deepCompare(true, true)).toBe(true);
  });

  it("should return false for different primitive values", () => {
    expect(deepCompare(1, 2)).toBe(false);
    expect(deepCompare("test", "different")).toBe(false);
    expect(deepCompare(true, false)).toBe(false);
  });

  it("should handle null and undefined correctly", () => {
    expect(deepCompare(null, null)).toBe(true);
    expect(deepCompare(undefined, undefined)).toBe(true);
    expect(deepCompare(null, undefined)).toBe(false);
    expect(deepCompare(1, null)).toBe(false);
    expect(deepCompare(undefined, "test")).toBe(false);
  });

  it("should return false when types do not match", () => {
    expect(deepCompare(1, "1")).toBe(false);
    expect(deepCompare(true, 1)).toBe(false);
    expect(deepCompare([], {})).toBe(false);
  });

  it("should compare date objects correctly", () => {
    const date1 = new Date("2023-01-01");
    const date2 = new Date("2023-01-01");
    const date3 = new Date("2023-02-01");

    expect(deepCompare(date1, date2)).toBe(true);
    expect(deepCompare(date1, date3)).toBe(false);
  });

  it("should compare arrays correctly", () => {
    expect(deepCompare([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepCompare([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepCompare([1, 2, 3], [1, 2])).toBe(false);
    expect(deepCompare([], [])).toBe(true);
  });

  it("should compare nested arrays correctly", () => {
    expect(deepCompare([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepCompare([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it("should compare objects correctly", () => {
    expect(deepCompare({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepCompare({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepCompare({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(deepCompare({}, {})).toBe(true);
  });

  it("should compare nested objects correctly", () => {
    expect(deepCompare({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } })).toBe(
      true,
    );
    expect(deepCompare({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 4 } })).toBe(
      false,
    );
  });

  it("should handle mixed nested structures", () => {
    const obj1 = { a: 1, b: [1, 2, { c: 3 }], d: new Date("2023-01-01") };
    const obj2 = { a: 1, b: [1, 2, { c: 3 }], d: new Date("2023-01-01") };
    const obj3 = { a: 1, b: [1, 2, { c: 4 }], d: new Date("2023-01-01") };

    expect(deepCompare(obj1, obj2)).toBe(true);
    expect(deepCompare(obj1, obj3)).toBe(false);
  });

  it("should prevent infinite recursion with circular references", () => {
    const obj1: any = { a: 1 };
    const obj2: any = { a: 1 };
    obj1.self = obj1;
    obj2.self = obj2;

    expect(deepCompare(obj1, obj2, 10)).toBe(false);
  });

  it("should respect the maxDepth parameter", () => {
    const obj1 = { a: { b: { c: { d: 1 } } } };
    const obj2 = { a: { b: { c: { d: 1 } } } };

    expect(deepCompare(obj1, obj2, 5)).toBe(true);
    expect(deepCompare(obj1, obj2, 2)).toBe(false);
  });

  it("should work with large objects", () => {
    const obj1 = {
      allDay: false,
      start: "2025-02-22T08:30:00.000Z",
      end: "2025-02-22T09:20:00.000Z",
      repeat: {
        type: "weekly",
        interval: 1,
        mode: "date",
        value: 1749312000000,
      },
      tag: "course",
      actualEnd: "2025-06-14T09:20:00.000Z",
      _deleted: false,
      color: "#fb9fb1",
      title: "實作專題一",
      id: "11320EE  390000-5-8-8",
    };
    const obj2 = {
      allDay: false,
      start: "2025-02-22T08:30:00.000Z",
      end: "2025-02-22T09:20:00.000Z",
      repeat: {
        type: "weekly",
        interval: 1,
        mode: "date",
        value: 1749312000000,
      },
      tag: "course",
      actualEnd: "2025-06-14T09:20:00.000Z",
      _deleted: false,
      color: "#fb9fb1",
      title: "實作專題一",
      id: "11320EE  390000-5-8-8",
    };

    expect(deepCompare(obj1, obj2)).toBe(true);
  });
});

describe("stripNullValues", () => {
  it("should return the same object if no null values exist", () => {
    const obj = { a: 1, b: "test", c: true };
    expect(stripNullValues(obj)).toEqual(obj);
  });

  it("should remove null values from an object", () => {
    const obj = { a: 1, b: null, c: "test" };
    expect(stripNullValues(obj)).toEqual({ a: 1, c: "test" });
  });

  it("should handle nested objects", () => {
    const obj = {
      a: 1,
      b: {
        c: null,
        d: "test",
        e: {
          f: null,
          g: 42,
        },
      },
    };

    // Type assertion is needed to avoid TypeScript errors about missing properties
    const expected = {
      a: 1,
      b: {
        d: "test",
        e: {
          g: 42,
        },
      },
    };

    expect(stripNullValues(obj)).toEqual(expected as any);
  });

  it("should handle arrays as values", () => {
    const obj = { a: [1, 2, 3], b: null };
    expect(stripNullValues(obj)).toEqual({ a: [1, 2, 3] });
  });

  it("should return empty object when all values are null", () => {
    const obj = { a: null, b: null };
    expect(stripNullValues(obj)).toEqual({});
  });

  it("should handle undefined values", () => {
    const obj = { a: undefined, b: null };
    expect(stripNullValues(obj)).toEqual({ a: undefined });
  });

  it("should not modify the original object", () => {
    const obj = { a: 1, b: null };
    const result = stripNullValues(obj);
    expect(obj).toEqual({ a: 1, b: null });
    expect(result).toEqual({ a: 1 });
  });

  it("should work with deepCompare to treat null properties as non-existent", () => {
    const obj1 = { a: 1, b: null };
    const obj2 = { a: 1 };

    // Using stripNullValues should make these objects equal for comparison
    expect(deepCompare(stripNullValues(obj1), stripNullValues(obj2))).toBe(
      true,
    );
  });
});
