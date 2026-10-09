import { describe, expect, test } from "bun:test";
import {
  getPttRenderedTextFragments,
  getPttToggleLabel,
  normalizePttReview,
  parsePttReview,
  parsePttResponse,
} from "./ptt";

const fixtureNames = [
  "standard-review.txt",
  "long-review.txt",
  "missing-fields.txt",
];

const fixture = (name: string) =>
  Bun.file(new URL(`./ptt-fixtures/${name}`, import.meta.url)).text();

describe("PTT review parsing", () => {
  test("parses the current template fields from the API content payload", async () => {
    const review = parsePttReview({
      text: await fixture("standard-review.txt"),
      date: "Mon Jul  4 22:14:50 2022",
    });

    expect(review).toMatchObject({
      parsed: true,
      courseName: "微積分Ｂ二",
      instructor: "顏東勇",
      target: "資工系必修",
      textbook: "教授自編講義",
      coolness: "★★★☆",
    });
    expect(review.grading).toContain("這學期大綱沒有寫");
  });

  test("keeps old persisted content responses as plain text", () => {
    const review = normalizePttReview({
      content: "legacy review text",
      date: "old date",
    });

    expect(review).toMatchObject({
      parsed: false,
      body: "legacy review text",
      content: "legacy review text",
      date: "old date",
    });
  });

  test("parses a fresh old-shaped API response while preserving its body", () => {
    const review = parsePttResponse({
      content: "課名: 測試課程\n老師: 測試教師",
      date: "2026-01-02",
    });

    expect(review.parsed).toBe(true);
    expect(review.body).toContain("課名: 測試課程");
  });

  test("preserves every non-whitespace body character in rendered fragments", async () => {
    for (const name of fixtureNames) {
      const body = (await fixture(name)).trim();
      const review = parsePttReview({ text: body });
      const rendered = getPttRenderedTextFragments(review).join("");

      for (const character of body.replace(/\s/g, ""))
        expect(rendered).toContain(character);
    }
  });

  test("keeps prose around recognised fields in its original order", () => {
    const review = parsePttReview({
      text: "開頭未標籤\n課名: 測試\n老師: 教師\n結尾未標籤",
    });
    const rendered = getPttRenderedTextFragments(review).join("");

    expect(rendered.indexOf("開頭未標籤")).toBeLessThan(
      rendered.indexOf("課名: 測試"),
    );
    expect(rendered.indexOf("結尾未標籤")).toBeGreaterThan(
      rendered.indexOf("老師: 教師"),
    );
  });

  test("uses the collapse label after the review opens", () => {
    expect(
      getPttToggleLabel(false, { expand: "Expand", collapse: "Collapse" }),
    ).toBe("Expand");
    expect(
      getPttToggleLabel(true, { expand: "Expand", collapse: "Collapse" }),
    ).toBe("Collapse");
  });
});
