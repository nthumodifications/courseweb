import { describe, expect, test } from "bun:test";
import fixture from "./syllabus-text.fixture.json";
import { cleanBrief, cleanContent, cleanKeywords } from "./syllabus-text";

describe("syllabus text cleaners", () => {
  test("cleans real keyword rows without splitting slash or parenthesized pairs", () => {
    const row = fixture.find((item) => item.raw_id === "11510CHEM465000")!;
    expect(cleanKeywords(row.keywords)).toEqual([
      "English lecture",
      "chemistry reaction",
      "metal catalyzed reaction",
      "organic synthesis",
    ]);
    expect(cleanKeywords("A (B), C/D，c/d")).toEqual(["A (B)", "C/D"]);
  });

  test("unwraps CJK and English hard wraps without changing paragraph intent", () => {
    const cjk = fixture.find((item) => item.raw_id === "11510JMU 302100")!;
    const english = fixture.find((item) => item.raw_id === "11510BME 502400")!;
    expect(cleanBrief(cjk.brief)).not.toContain("洲\n浪");
    expect(cleanBrief(english.brief)).toContain("carbon-based nanomaterials");
    expect(cleanBrief("第一段很短\n第二段也很短")).toBe(
      "第一段很短\n第二段也很短",
    );
    // A short line is structure (heading, list item, paragraph end): it is
    // never joined, even when the next line could continue the sentence.
    expect(cleanBrief("培養六大\n核心能力以及全人照護精神為目標。")).toBe(
      "培養六大\n核心能力以及全人照護精神為目標。",
    );
  });

  test("removes the duplicated keyword paragraph and creates template sections", () => {
    const row = fixture.find((item) => item.raw_id === "11510KPC 210500")!;
    const cleaned = cleanContent(row.content);
    expect(cleaned.text).not.toMatch(/^Course keywords/i);
    expect(cleaned.sections.map((section) => section.key)).toEqual([
      "description",
      "textbooks",
      "references",
      "method",
      "schedule",
      "evaluation",
    ]);
  });

  test("recognizes bullet headings and keeps aligned table breaks", () => {
    const bullet = fixture.find((item) => item.raw_id === "11510AES 710100")!;
    const table = fixture.find((item) => item.raw_id === "11510JMU 302100")!;
    expect(cleanContent(bullet.content).sections).toHaveLength(4);
    expect(cleanContent(table.content).text).toContain("第一週\t緒論");

    const weekly = cleanContent(
      "Week 1 — Introduction\nWhat soft materials are\nWeek 2 — Applications\nHydrogels and polymers",
    );
    expect(weekly.text).toContain("\nWeek 2 — Applications");
  });

  test("keeps leading text and repeated section titles", () => {
    const cleaned = cleanContent("前言\n一、課程說明\n一、課程說明\n正文");
    expect(cleaned.sections).toEqual([
      { key: "other", title: "", body: "前言" },
      {
        key: "description",
        title: "一、課程說明",
        body: "一、課程說明\n正文",
      },
    ]);
    expect(cleaned.text).toBe("前言\n一、課程說明\n一、課程說明\n正文");
  });

  test("turns the registrar placeholder into missing content", () => {
    const row = fixture.find((item) => item.raw_id === "11510CL  151000")!;
    expect(cleanContent(row.content)).toEqual({ text: null, sections: [] });
  });

  test("matches exact outputs for the round-two wrap fixtures", () => {
    for (const row of fixture) {
      if (!row.expected) continue;
      expect(cleanBrief(row.brief)).toBe(row.expected.brief);
      if (row.expected.content !== undefined) {
        expect(cleanContent(row.content).text).toBe(row.expected.content);
      }
    }
  });

  test("keeps the registrar boundary, teacher keywords, and short headings", () => {
    const regressions = [
      {
        rawId: "11510AIA 500100",
        raw: "Course keywords:        📢 臺灣大專院校人工智慧學程聯盟 (TAICA) 跨校課程修課須知\r本課程為 TAICA 聯盟開放之跨校遠距課程",
        expected:
          "📢 臺灣大專院校人工智慧學程聯盟 (TAICA) 跨校課程修課須知本課程為 TAICA 聯盟開放之跨校遠距課程",
      },
      {
        rawId: "11510BMES312101",
        raw: "Course keywords: 電子實驗      Course keywords:\r基本電子元件儀器，影像處理分，電訊號量測\r\r課程說明：\r1. 選課：每班上限25人。",
        expected:
          "Course keywords:\n基本電子元件儀器，影像處理分，電訊號量測\n課程說明：\n1. 選課：每班上限25人。",
      },
      {
        rawId: "11510CHEM480000",
        raw: "Course keywords:  專題研究      Course keywords:\r專題研究\r\r一、修課規定\r\r請將「加簽申請單」\r\r加簽申請單下載網\r址:https://example.test/doc",
        expected:
          "Course keywords:\n專題研究\n\n一、修課規定\n\n請將「加簽申請單」\n\n加簽申請單下載網\n址:https://example.test/doc",
      },
    ];

    for (const regression of regressions) {
      expect(cleanContent(regression.raw).text, regression.rawId).toBe(
        regression.expected,
      );
    }
  });

  test("keyword cleaning is idempotent and re-cleaning text loses nothing", () => {
    for (const row of fixture) {
      const brief = cleanBrief(row.brief);
      const keywords = cleanKeywords(row.keywords);
      const content = cleanContent(row.content);
      expect(cleanKeywords(keywords)).toEqual(keywords);
      // Text cleaning runs on the stored registrar text at read time. A second
      // pass must never lose characters, but may see new "full" lines.
      const again = cleanBrief(brief);
      expect(again?.replace(/\s/g, "")).toBe(brief?.replace(/\s/g, ""));
      expect(cleanContent(content.text).text?.replace(/\s/g, "")).toBe(
        content.text?.replace(/\s/g, ""),
      );
    }
  });
});
