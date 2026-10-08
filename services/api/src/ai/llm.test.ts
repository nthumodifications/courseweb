import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  accumulateGroqToolCallDelta,
  classifyProviderError,
  convertToolDeclarations,
  generateJSON,
  isAllowedPdfUrl,
  allowedPdfHosts,
  MAX_TOOL_CALLS_PER_REQUEST,
  normalizeWorkersAiOutput,
  pdfMarkdownBody,
  readableProviderMessage,
  streamChatWithTools,
  TOOL_CALL_BUDGET_ERROR,
  validateAgainstSchema,
} from "./llm";
import type { Context } from "hono";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("LLM provider helpers", () => {
  it("allows only HTTPS PDF hosts on the explicit allowlist", () => {
    expect(isAllowedPdfUrl("https://registra.site.nthu.edu.tw/r.pdf")).toBe(
      true,
    );
    expect(isAllowedPdfUrl("http://registra.site.nthu.edu.tw/r.pdf")).toBe(
      false,
    );
    expect(isAllowedPdfUrl("https://attacker.example/r.pdf")).toBe(false);
    expect(
      isAllowedPdfUrl(
        "https://project.supabase.co/r.pdf",
        allowedPdfHosts({ SUPABASE_URL: "https://project.supabase.co" }),
      ),
    ).toBe(true);
  });

  it("rejects an unallowlisted PDF before making a fetch", async () => {
    let fetchCalls = 0;
    globalThis.fetch = mock(async () => {
      fetchCalls += 1;
      return new Response(new Uint8Array([37, 80, 68, 70]));
    }) as unknown as typeof fetch;

    await expect(
      generateJSON({
        env: { GROQ_API_KEY: "test-key", GROQ_CHAT_MODELS: "test-model" },
        purpose: "summary",
        system: "Return JSON.",
        text: "test",
        pdf: { url: "https://attacker.example/document.pdf" },
        schema: { type: "object" },
      }),
    ).rejects.toThrow("PDF host is not allowlisted");
    expect(fetchCalls).toBe(0);
  });

  it("classifies quota, auth, unavailable, and malformed request errors", () => {
    expect(classifyProviderError({ status: 402 }).code).toBe("quota");
    expect(classifyProviderError({ status: 401 }).code).toBe("auth");
    expect(classifyProviderError({ status: 404 }).code).toBe("unavailable");
    expect(
      classifyProviderError({ status: 400, message: "API_KEY_INVALID" }).code,
    ).toBe("auth");
    expect(
      classifyProviderError({ status: 400, message: "invalid schema" }).code,
    ).toBe("bad_request");
  });

  it("converts the Gemini tool declarations to lowercase JSON Schema", () => {
    const [tool] = convertToolDeclarations();
    expect(tool.type).toBe("function");
    expect(tool.function.parameters.type).toBe("object");
    expect(tool.function.parameters.properties).toBeDefined();
    expect(
      (tool.function.parameters.properties as Record<string, { type?: string }>)
        .query.type,
    ).toBe("string");
  });

  it("accumulates fragmented Groq tool-call arguments", () => {
    const calls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();
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
              content: call === 1 ? "not json" : JSON.stringify({ ok: true }),
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

  it("walks the configured provider order and skips providers without keys", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (input, init) => {
      urls.push(String(input));
      const body = JSON.parse(String(init?.body));
      if (body.model === "cerebras-order") {
        return new Response("Cerebras unavailable", { status: 503 });
      }
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      });
    }) as unknown as typeof fetch;

    const result = await generateJSON<{ ok: boolean }>({
      env: {
        AI_PROVIDER_ORDER: "openrouter,cerebras,groq,mistral",
        CEREBRAS_API_KEY: "cerebras-key",
        CEREBRAS_CHAT_MODELS: "cerebras-order",
        GROQ_API_KEY: "groq-key",
        GROQ_CHAT_MODELS: "groq-order",
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

    expect(result).toMatchObject({ provider: "groq", model: "groq-order" });
    expect(urls).toEqual([
      "https://api.cerebras.ai/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ]);
  });

  it("adds OpenRouter attribution headers and JSON mode", async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = mock(async (_input, init) => {
      request = init;
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      });
    }) as unknown as typeof fetch;

    await generateJSON<{ ok: boolean }>({
      env: {
        OPENROUTER_API_KEY: "openrouter-key",
        OPENROUTER_CHAT_MODELS: "google/gemma-4-31b-it:free",
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

    const headers = new Headers(request?.headers);
    const body = JSON.parse(String(request?.body));
    expect(headers.get("Authorization")).toBe("Bearer openrouter-key");
    expect(headers.get("HTTP-Referer")).toBe("https://nthumods.com");
    expect(headers.get("X-Title")).toBe("NTHUMods");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  for (const testCase of [
    {
      name: "402 quota",
      primary: "openrouter",
      primaryKey: "OPENROUTER_API_KEY",
      primaryModels: "openrouter-402",
      fallback: "mistral",
      fallbackKey: "MISTRAL_API_KEY",
      fallbackModels: "mistral-after-402",
      status: 402,
      message: "insufficient credits for free model",
    },
    {
      name: "429 quota",
      primary: "cerebras",
      primaryKey: "CEREBRAS_API_KEY",
      primaryModels: "cerebras-429",
      fallback: "mistral",
      fallbackKey: "MISTRAL_API_KEY",
      fallbackModels: "mistral-after-429",
      status: 429,
      message: "daily request limit exceeded",
    },
    {
      name: "500 unavailable",
      primary: "mistral",
      primaryKey: "MISTRAL_API_KEY",
      primaryModels: "mistral-500",
      fallback: "cerebras",
      fallbackKey: "CEREBRAS_API_KEY",
      fallbackModels: "cerebras-after-500",
      status: 500,
      message: "provider outage",
    },
  ] as const) {
    it(`falls through on ${testCase.name}`, async () => {
      const urls: string[] = [];
      let calls = 0;
      globalThis.fetch = mock(async (input) => {
        urls.push(String(input));
        calls += 1;
        if (calls === 1) {
          return new Response(testCase.message, { status: testCase.status });
        }
        return Response.json({
          choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        });
      }) as unknown as typeof fetch;

      const result = await generateJSON<{ ok: boolean }>({
        env: {
          AI_PROVIDER_ORDER: `${testCase.primary},${testCase.fallback}`,
          [testCase.primaryKey]: "primary-key",
          [testCase.primary === "openrouter"
            ? "OPENROUTER_CHAT_MODELS"
            : testCase.primary === "cerebras"
              ? "CEREBRAS_CHAT_MODELS"
              : "MISTRAL_CHAT_MODELS"]: testCase.primaryModels,
          [testCase.fallbackKey]: "fallback-key",
          [testCase.fallback === "mistral"
            ? "MISTRAL_CHAT_MODELS"
            : "CEREBRAS_CHAT_MODELS"]: testCase.fallbackModels,
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

      expect(result.provider).toBe(testCase.fallback);
      expect(urls).toHaveLength(2);
    });
  }
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

  it("returns invalid tool arguments to the model instead of throwing a request error", async () => {
    let calls = 0;
    const env = {
      AI_PROVIDER_ORDER: "workers-ai",
      AI: {
        run: async () => {
          calls += 1;
          return calls === 1
            ? {
                choices: [
                  {
                    message: {
                      content: null,
                      tool_calls: [
                        {
                          id: "bad-args",
                          function: {
                            name: "get_bus_departures",
                            arguments: JSON.stringify({
                              direction: "sideways",
                            }),
                          },
                        },
                      ],
                    },
                  },
                ],
              }
            : {
                choices: [
                  { message: { content: "The request was rejected." } },
                ],
              };
        },
      },
    };

    const events = [];
    for await (const event of streamChatWithTools(
      { env } as unknown as Context,
      [{ role: "user", content: "check the bus" }],
      {},
      { env },
    )) {
      events.push(event);
    }

    expect(events).toContainEqual({
      type: "tool_result",
      data: {
        name: "get_bus_departures",
        error: expect.stringContaining(
          "Invalid arguments for get_bus_departures",
        ),
      },
    });
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("does not send unknown or unused context fields to the model", async () => {
    let modelInput: Record<string, unknown> | undefined;
    const env = {
      AI_PROVIDER_ORDER: "workers-ai",
      AI: {
        run: async (_model: string, input: Record<string, unknown>) => {
          modelInput = input;
          return { choices: [{ message: { content: "done" } }] };
        },
      },
    };

    for await (const _event of streamChatWithTools(
      { env } as unknown as Context,
      [{ role: "user", content: "help me plan" }],
      {
        department: "資訊工程學系",
        entranceYear: "113",
        currentSemester: "11510",
        currentYear: 2026,
        language: "zh",
        token: "secret-token",
        email: "student@example.com",
        studentId: "S123456",
        selectedCourses: [
          {
            raw_id: "11510CS 535100",
            name_zh: "人工智慧",
            times: ["M3M4"],
            credits: 3,
          },
        ],
      } as never,
      { env },
    )) {
      // Consume the stream so the provider request is made.
    }

    const serialized = JSON.stringify(modelInput);
    expect(serialized).toContain("資訊工程學系");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("student@example.com");
    expect(serialized).not.toContain("S123456");
    expect(serialized).not.toContain('"credits"');
  });

  it("stops after the total tool-call budget across turns", async () => {
    const env = {
      AI_PROVIDER_ORDER: "workers-ai",
      AI: {
        run: async () => ({
          choices: [
            {
              message: {
                content: null,
                tool_calls: Array.from({ length: 4 }, (_, index) => ({
                  id: `unknown-${index}`,
                  function: { name: "unknown_tool", arguments: "{}" },
                })),
              },
            },
          ],
        }),
      },
    };

    const events = [];
    for await (const event of streamChatWithTools(
      { env } as unknown as Context,
      [{ role: "user", content: "keep trying" }],
      {},
      { env },
    )) {
      events.push(event);
    }

    expect(events.filter((event) => event.type === "tool_call")).toHaveLength(
      32,
    );
    expect(events).toContainEqual({
      type: "error",
      data: TOOL_CALL_BUDGET_ERROR,
      code: "bad_request",
    });
    expect(events.at(-1)).toEqual({ type: "done" });
  });
});

describe("readableProviderMessage", () => {
  it("pulls the message out of a Google error body", () => {
    expect(
      readableProviderMessage(
        '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}',
      ),
    ).toBe("API key not valid. Please pass a valid API key.");
    expect(readableProviderMessage("groq 413: plain text")).toBe(
      "groq 413: plain text",
    );
  });
});

describe("pdfMarkdownBody", () => {
  it("sees an unreadable PDF as empty", () => {
    // Real toMarkdown output for a PEO opening-hours PDF (an Excel export).
    const markdown =
      "# pool.pdf\n## Metadata\n- PDFFormatVersion=1.5\n- Language=zh-TW\n- Producer=Microsoft® Excel® 2016\n\n\n\n## Contents\n### Page 1\n\n\n";
    expect(pdfMarkdownBody(markdown)).toBe("");
  });

  it("keeps real page text", () => {
    expect(
      pdfMarkdownBody(
        "# a.pdf\n## Metadata\n- x=y\n## Contents\n### Page 1\n課程目標 Learn things\n",
      ),
    ).toBe("課程目標 Learn things");
  });
});
