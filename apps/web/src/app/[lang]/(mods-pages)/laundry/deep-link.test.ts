import { describe, expect, test } from "bun:test";
import {
  getLaundryDormFromSearchParams,
  resolveLaundryDeepLink,
  shouldPersistLaundryDorm,
} from "./deep-link";

describe("resolveLaundryDeepLink", () => {
  test.each([
    ["dorm=jen", "明齋", { dorm: "仁齋", area: null }],
    ["dorm=jen&area=jen_m", "明齋", { dorm: "仁齋", area: "仁齋男" }],
    ["area=jen_f", "明齋", { dorm: "仁齋", area: "仁齋女" }],
    ["dorm=jen&area=yi", "明齋", { dorm: "仁齋", area: null }],
    ["dorm=unknown&area=unknown", "明齋", { dorm: "明齋", area: null }],
    ["dorm=toString", "明齋", { dorm: "明齋", area: null }],
    ["dorm=constructor", "明齋", { dorm: "明齋", area: null }],
    ["dorm=__proto__", "明齋", { dorm: "明齋", area: null }],
    ["area=toString", "明齋", { dorm: "明齋", area: null }],
    ["area=constructor", "明齋", { dorm: "明齋", area: null }],
    ["area=__proto__", "明齋", { dorm: "明齋", area: null }],
    ["dorm=jen&dorm=yi", "明齋", { dorm: "明齋", area: null }],
    ["area=jen_m&area=jen_f", "明齋", { dorm: "明齋", area: null }],
    ["", "明齋", { dorm: "明齋", area: null }],
  ])("resolves %s with stored dorm %s", (query, storedDorm, expected) => {
    expect(
      resolveLaundryDeepLink(new URLSearchParams(query), storedDorm),
    ).toEqual(expected);
  });
});

describe("shouldPersistLaundryDorm", () => {
  test.each([
    ["dorm=jen", "仁齋", "明齋", true],
    ["area=jen_f", "仁齋", "明齋", true],
    ["dorm=jen", "仁齋", "仁齋", false],
    ["", "明齋", "明齋", false],
    ["dorm=unknown", "明齋", "明齋", false],
  ])(
    "persists only for a changed valid URL dorm: %s",
    (query, resolvedDorm, storedDorm, expected) => {
      const params = new URLSearchParams(query);
      expect(getLaundryDormFromSearchParams(params)).toBe(
        query === "" || query === "dorm=unknown" ? null : "仁齋",
      );
      expect(
        shouldPersistLaundryDorm(
          resolvedDorm,
          getLaundryDormFromSearchParams(params),
          storedDorm,
        ),
      ).toBe(expected);
    },
  );
});
