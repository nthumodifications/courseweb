import { describe, expect, mock, test } from "bun:test";
import { isLocalSearchEnabled, withCourseText } from "./search-client";
import {
  cleanSyllabusFields,
  normalizeSyllabusKeywords,
} from "./syllabus-text";

const sanitize = mock((html: string) =>
  html
    .replace(/ data-[^=]+="[^"]*"/g, "")
    .replace(/ on\w+="[^"]*"/g, "")
    .replace(/<script>[\s\S]*?<\/script>/g, ""),
);
mock.module("dompurify", () => ({ default: { sanitize } }));
const { sanitizeCourseHtml } = await import("./sanitizeHtml");

describe("search client boundary behavior", () => {
  test.each([
    [{ VITE_ENABLE_LOCAL_SEARCH: "1" }, true],
    [{ VITE_ENABLE_LOCAL_SEARCH: " TRUE " }, true],
    [{ VITE_ENABLE_LOCAL_SEARCH: "0" }, false],
    [{}, false],
  ])("reads local-search flag %j", (env, expected) => {
    expect(isLocalSearchEnabled(env)).toBe(expected);
  });

  test("fills local syllabus text without changing an unchanged hit identity", () => {
    const hit = { raw_id: "11510AES 450100", brief: null, keywords: null };
    const same = withCourseText(hit, { getCourseText: () => undefined });
    expect(same).toBe(hit);
    expect(
      withCourseText(hit, {
        getCourseText: () => ({ brief: "A brief", keywords: ["lab"] }),
      }),
    ).toEqual({ raw_id: hit.raw_id, brief: "A brief", keywords: ["lab"] });
  });
});

describe("syllabus normalization and HTML boundaries", () => {
  test.each([
    [null, null],
    [
      ["lab", 3, null, { ignored: true }],
      ["lab", "3"],
    ],
    [{ ignored: true }, null],
  ])("normalizes keyword input %j", (value, expected) => {
    expect(normalizeSyllabusKeywords(value)).toEqual(expected);
  });

  test("cleans a realistic syllabus field bundle", () => {
    expect(
      cleanSyllabusFields({
        brief: "第一週\r\n第二週",
        keywords: "lab, fieldwork",
        content: "一、課程說明\n內容",
      }),
    ).toMatchObject({
      brief: expect.any(String),
      keywords: ["lab", "fieldwork"],
    });
  });

  test("keeps allowed formatting but removes scripts and data attributes", () => {
    const html =
      '<p data-x="1">安全</p><script>alert(1)</script><a href="/course" onclick="x()">課程</a>';
    const clean = sanitizeCourseHtml(html);
    expect(clean).toContain("<p>安全</p>");
    expect(clean).toContain('<a href="/course">課程</a>');
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
  });
});
