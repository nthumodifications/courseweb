import { describe, expect, test } from "bun:test";
import { SSEParser } from "./sseParser";

describe("SSEParser", () => {
  test("buffers JSON and UTF-8-decoded chunks until a complete frame", () => {
    const parser = new SSEParser();

    expect(parser.push('data: {"type":"te')).toEqual([]);
    expect(parser.push('xt","data":"嗨"}\n\n')).toEqual([
      { type: "text", data: "嗨" },
    ]);
  });

  test("supports CRLF, DONE, and a final frame without a trailing newline", () => {
    const parser = new SSEParser();

    expect(
      parser.push('data: {"type":"meta","data":{"provider":"groq"}}\r\n\r\n'),
    ).toEqual([{ type: "meta", data: { provider: "groq" } }]);
    expect(parser.push("data: [DONE]\n\n")).toEqual(["[DONE]"]);

    const finalParser = new SSEParser();
    finalParser.push('data: {"type":"done"}');
    expect(finalParser.finish()).toEqual([{ type: "done" }]);
  });

  test("ignores comments and malformed frames without losing later events", () => {
    const parser = new SSEParser();

    expect(
      parser.push(
        ': keep-alive\n\ndata: not-json\n\ndata: {"type":"done"}\n\n',
      ),
    ).toEqual([{ type: "done" }]);
  });
});
