import { describe, expect, test } from "bun:test";

import { extractAcixstore } from "./acixstore";

const validValue = "Abc123_-session-value";

describe("extractAcixstore", () => {
  test.each([
    ["bare value", validValue, validValue],
    [
      "full URL",
      `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${validValue}&hint=123`,
      validValue,
    ],
    [
      "ACIXSTORE fragment with trailing hint",
      `ACIXSTORE=${validValue}&hint=123`,
      validValue,
    ],
    ["surrounding whitespace", `  ${validValue}  `, validValue],
  ])("accepts %s", (_caseName, input, expected) => {
    expect(extractAcixstore(input)).toBe(expected);
  });

  test.each([
    ["empty input", ""],
    ["too short", "abc123"],
    ["invalid characters", `${validValue}!`],
    ["unrelated text", "this is not an ACIXSTORE value"],
    ["embedded query in garbage", `garbage ACIXSTORE=${validValue}`],
  ])("rejects %s", (_caseName, input) => {
    expect(extractAcixstore(input)).toBeNull();
  });
});
