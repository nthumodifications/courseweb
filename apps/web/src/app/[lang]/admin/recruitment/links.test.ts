import { describe, expect, test } from "bun:test";
import { applicationLinks } from "./links";

describe("applicationLinks", () => {
  test("keeps http(s) links with their labels", () => {
    expect(
      applicationLinks({
        github: "https://github.com/example",
        portfolio: "http://example.com/work",
      }),
    ).toEqual([
      ["github", "https://github.com/example"],
      ["portfolio", "http://example.com/work"],
    ]);
  });

  test("drops links an admin's click would run as script", () => {
    expect(
      applicationLinks({
        github: "javascript:alert(document.domain)",
        portfolio: "data:text/html,<script>alert(1)</script>",
        blog: "https://example.com/blog",
      }),
    ).toEqual([["blog", "https://example.com/blog"]]);
  });

  test("drops empty and non-string values", () => {
    expect(applicationLinks({ github: "", portfolio: null, blog: 42 })).toEqual(
      [],
    );
  });

  test("treats a missing links object as no links", () => {
    expect(applicationLinks(null)).toEqual([]);
    expect(applicationLinks(undefined)).toEqual([]);
  });
});
