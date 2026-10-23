import { describe, expect, test } from "bun:test";
import {
  decodeSchoolText,
  fetchOcrResult,
  parseSyllabusMarkup,
} from "./syllabus";

test("sends a browser-like User-Agent to the OCR service", async () => {
  const originalFetch = globalThis.fetch;
  let requestInit: RequestInit | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestInit = init;
    return new Response("123", { status: 200 });
  }) as unknown as typeof fetch;

  try {
    await expect(fetchOcrResult("test-store")).resolves.toBe("123");
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(new Headers(requestInit?.headers).get("User-Agent")).toStartWith(
    "Mozilla/5.0",
  );
});

describe("school syllabus text decoding", () => {
  test.each(["JH84201.html", "JH84202_114_30.html", "JH84202_115_10.html"])(
    "keeps the saved CCXP fixture decoding identical to HEAD: %s",
    async (fixture) => {
      const bytes = await Bun.file(
        new URL(`../fixtures/ccxp/${fixture}`, import.meta.url),
      ).arrayBuffer();
      const headDecoded = new TextDecoder("big5").decode(new Uint8Array(bytes));
      expect(decodeSchoolText(bytes)).toBe(headDecoded);
    },
  );

  test("keeps Big5 decoding for school text", () => {
    const big5 = new Uint8Array([
      0xa4, 0xa4, 0xa4, 0xe5, 0x20, 0x43, 0x6f, 0x75, 0x72, 0x73, 0x65,
    ]).buffer;
    expect(decodeSchoolText(big5)).toBe("中文 Course");
  });

  test("keeps the normal syllabus markup contract and rejects changed markup", () => {
    const html = [
      "<p>keyword1,keyword2</p>",
      ...Array.from({ length: 4 }, () => "<table></table>"),
      '<table><td class="class2">Brief</td></table>',
      '<table><td class="class2">Content</td></table>',
    ].join("");
    expect(parseSyllabusMarkup(html)).toEqual({
      brief: "Brief",
      keywords: "keyword1,keyword2",
      content: "Content",
      pdfHref: null,
    });
    expect(parseSyllabusMarkup("")).toBeNull();
    expect(parseSyllabusMarkup("<html>error</html>")).toBeNull();
  });
});
