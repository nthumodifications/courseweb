import { describe, expect, test } from "bun:test";

import {
  contributionErrorCodes,
  getContributionErrorMessage,
} from "./contribution-error";

const messages = {
  invalid_session: "invalid session",
  session_expired: "session expired",
  school_unreachable: "school unreachable",
  school_response_invalid: "invalid school response",
  invalid_semester: "invalid semester",
  storage_error: "storage error",
  unknown: "generic error",
};

describe("course statistics error messages", () => {
  test.each(contributionErrorCodes)("localizes the typed error %s", (code) => {
    expect(getContributionErrorMessage(messages, code)).toBe(messages[code]);
  });

  test.each(["", "network_failure", "unknown"])(
    "uses the generic message for %s",
    (code) => {
      expect(getContributionErrorMessage(messages, code)).toBe(
        messages.unknown,
      );
    },
  );
});
