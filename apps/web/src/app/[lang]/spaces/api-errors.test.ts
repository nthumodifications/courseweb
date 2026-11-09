import { describe, expect, test } from "bun:test";
import en from "../../../dictionaries/en.json";
import zh from "../../../dictionaries/zh.json";
import zhHans from "../../../dictionaries/zh-hans.json";
import { getSpaceErrorMessage, SpaceApiError } from "./api";

const translationKeys = [
  "errorInvalidRange",
  "errorTooSoon",
  "errorTooLong",
  "errorSlot",
  "errorHours",
  "errorBlackout",
  "errorLimit",
  "errorNthu",
  "errorMembers",
  "errorAllowList",
  "errorBorrowingUnit",
  "errorPurpose",
  "errorHeadcount",
  "errorHeadcountInvalid",
  "errorConflict",
  "slugTaken",
  "errorAlreadyStarted",
  "errorLastOwner",
  "errorUserNotFound",
  "errorAllowListUserNotFound",
  "errorReasonRequired",
  "errorRateLimited",
];

describe("space API error messages", () => {
  test("maps backend error codes and booking rule violations to human copy", () => {
    const labels = Object.fromEntries(translationKeys.map((key) => [key, key]));
    expect(
      getSpaceErrorMessage(
        new SpaceApiError("booking_rules_failed", 400, ["too_soon"]),
        labels,
        "bookingFailed",
      ),
    ).toBe("errorTooSoon");
    expect(
      getSpaceErrorMessage(new SpaceApiError("booking_conflict", 409), labels),
    ).toBe("errorConflict");
    for (const code of [
      "slug_taken",
      "already_started",
      "last_owner",
      "user_not_found",
      "allow_list_user_not_found",
      "reason_required",
      "rate_limited",
    ]) {
      expect(
        getSpaceErrorMessage(
          new SpaceApiError(code, code === "rate_limited" ? 429 : 409),
          labels,
        ),
      ).not.toBe(code);
    }
  });

  test("has localized copy for each backend error across all web locales", () => {
    for (const dictionary of [en, zh, zhHans]) {
      const labels = dictionary.spaces as Record<string, unknown>;
      for (const key of translationKeys) {
        expect(typeof labels[key]).toBe("string");
        expect(String(labels[key]).length).toBeGreaterThan(0);
      }
    }
  });
});
