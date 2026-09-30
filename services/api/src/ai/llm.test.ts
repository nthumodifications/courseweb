import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  accumulateGroqToolCallDelta,
  classifyProviderError,
  convertToolDeclarations,
  generateJSON,
  normalizeWorkersAiOutput,
  validateAgainstSchema,
} from "./llm";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("LLM provider helpers", () => {
  it("classifies quota, auth, unavailable, and malformed request errors", () => {
    expect(classifyProviderError({ status: 402 }).code).toBe("quota");
    expect(classifyProviderError({ status: 401 }).code).toBe("auth");
    expect(classifyProviderError({ status: 404 }).code).toBe("unavailable");
    expect(classifyProviderError({ status: 400, message: "API_KEY_INVALID" }).code).toBe(
      "auth",
    );
    expect(classifyProviderError({ status: 400, message: "invalid schema" }).code).toBe(
      "bad_request",
    );
  });

  it("converts the Gemini tool declarations to lowercase JSON Schema", () => {
    const [tool] = convertToolDeclarations();
    expect(tool.type).toBe("function");
    expect(tool.function.parameters.type).toBe("object");
    expect(tool.function.parameters.properties).toBeDefined();
    expect(
      (tool.function.parameters.properties as Record<string, { type?: string }>).query.type,
    ).toBe("string");
  });

  it("accumulates fragmented Groq tool-call arguments", () => {
    const calls = new Map<number, { id: string; name: string; arguments: string }>();
    accumulateGroqToolCallDelta(calls, {
      index: 0,
      id: "call-1",
      function: { name: "search_courses", arguments: '{"query":' },
    });
    accumulateGroqToolCallDelta(calls, {
      index: 0,
      function: { arguments: '"AI"}' },
    });
    expect(calls.get(0)).toEqual({
      id: "call-1",
      name: "search_courses",
      arguments: '{"query":"AI"}',
    });
  });

  it("falls through to the next model when JSON is malformed", async () => {
    let call = 0;
    globalThis.fetch = mock(async () => {
      call += 1;
      return Response.json({
        choices: [
          {
            message: {
              content:
                call === 1
                  ? "not json"
                  : JSON.stringify({ ok: true }),
            },
          },
        ],
      });
    }) as unknown as typeof fetch;

    const result = await generateJSON<{ ok: boolean }>({
      env: {
        GROQ_API_KEY: "test-key",
        GROQ_CHAT_MODELS: "first-model,second-model",
      },
      purpose: "summary",
      system: "Return JSON.",
      text: "test",
      schema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
    });

    expect(result).toMatchObject({ provider: "groq", model: "second-model" });
    expect(result.data).toEqual({ ok: true });
    expect(call).toBe(2);
  });

  it("validates required properties and nested arrays", () => {
    const schema = {
      type: "object",
      properties: { values: { type: "array", items: { type: "integer" } } },
      required: ["values"],
    };
    expect(validateAgainstSchema({ values: [1, 2] }, schema)).toBe(true);
    expect(validateAgainstSchema({ values: [1, "2"] }, schema)).toBe(false);
    expect(validateAgainstSchema({}, schema)).toBe(false);
  });
});

describe("normalizeWorkersAiOutput", () => {
  // Shapes captured from the live Workers AI REST API on 2026-09-29.
  it("reads OpenAI-style choices from gpt-oss", () => {
    const out = normalizeWorkersAiOutput({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "chatcmpl-tool-1",
                type: "function",
                function: {
                  name: "search_courses",
                  arguments: '{"query": "machine learning"}',
                },
              },
            ],
          },
        },
      ],
    });
    expect(out.text).toBe("");
    expect(out.toolCalls).toEqual([
      {
        id: "chatcmpl-tool-1",
        name: "search_courses",
        args: '{"query": "machine learning"}',
      },
    ]);
  });

  it("reads choice content for JSON answers", () => {
    const out = normalizeWorkersAiOutput({
      choices: [{ message: { content: '{"ok":true,"n":3}' } }],
    });
    expect(JSON.parse(out.text)).toEqual({ ok: true, n: 3 });
  });

  it("stringifies a legacy response that is already an object", () => {
    const out = normalizeWorkersAiOutput({
      response: { n: 3, ok: true },
      tool_calls: [],
    });
    expect(JSON.parse(out.text)).toEqual({ n: 3, ok: true });
  });

  it("reads legacy top-level tool calls", () => {
    const out = normalizeWorkersAiOutput({
      response: null,
      tool_calls: [{ name: "search_courses", arguments: { query: "ml" } }],
    });
    expect(out.toolCalls).toEqual([
      { id: "call_0", name: "search_courses", args: { query: "ml" } },
    ]);
  });
});
