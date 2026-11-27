import { describe, expect, it } from "bun:test";
import { parseShortlinkResponse } from "./shortlinkResponse";

describe("parseShortlinkResponse", () => {
  it.each([
    ["https://short.example/abc", "https://short.example/abc"],
    ["  https://short.example/abc  ", "https://short.example/abc"],
    ["http://short.example/abc", "http://short.example/abc"],
    ["\nhttp://short.example/abc\t", "http://short.example/abc"],
  ])("accepts an HTTP URL and trims surrounding whitespace", (body, result) => {
    expect(parseShortlinkResponse(true, body)).toBe(result);
  });

  it.each(["https://short.example/abc", '{"error":"rate limited"}'])(
    "rejects a non-OK response body: %s",
    (body) => {
      expect(parseShortlinkResponse(false, body)).toBeNull();
    },
  );

  it.each([
    "",
    "   ",
    '{"error":"rate limited"}',
    "not a URL",
    "javascript:alert(1)",
  ])("rejects invalid response content: %s", (body) => {
    expect(parseShortlinkResponse(true, body)).toBeNull();
  });
});
