import { describe, expect, mock, test } from "bun:test";
import { createSupabaseServerMock } from "./test-helpers/module-mocks";

mock.module("./config/supabase_server", () =>
  createSupabaseServerMock(() => ({
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: [
            {
              raw_id: "11510-CS 101000",
              name_zh: "測試課程",
              teacher_zh: ["測試教師"],
            },
          ],
          error: null,
        }),
      }),
    }),
  })),
);

const { default: course } = await import("./course");

describe("live PTT course feed", () => {
  test("returns canonical URL, author, and ISO post date", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string) => ({
      text: async () =>
        url.includes("/search?")
          ? '<div class="r-ent"><div class="title"><a href="/bbs/NTHU_Course/M.1656944090.A.123.html">post</a></div></div>'
          : `<div id="main-content">
            <span class="article-meta-value">tester</span>
            <span class="article-meta-value">board</span>
            <span class="article-meta-value">title</span>
            <span class="article-meta-value">Mon Jul  4 22:14:50 2022</span>
            看板NTHU_Course標題內容--<div id="article-polling"></div></div>`,
    })) as unknown as typeof fetch;

    try {
      const response = await course.request("/11510-CS%20101000/ptt");
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject([
        {
          sourceUrl:
            "https://www.ptt.cc/bbs/NTHU_Course/M.1656944090.A.123.html",
          sourceAuthor: "tester",
          date: "2022-07-04T14:14:50.000Z",
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
