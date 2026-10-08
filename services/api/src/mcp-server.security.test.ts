import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import mcpServer from "./mcp-server";

const originalConsoleError = console.error;

afterEach(() => {
  console.error = originalConsoleError;
});

const postMcp = (body: unknown) =>
  mcpServer.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("MCP abuse controls", () => {
  it("rejects a request body over 64 KB as invalid params", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      method: "initialize",
      params: { padding: "x".repeat(65 * 1024) },
      id: 1,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      jsonrpc: "2.0",
      error: { code: -32602, message: "Invalid parameters" },
      id: null,
    });
  });

  it("rejects oversized bulk queries without calling an upstream", async () => {
    const fetchMock = mock(async () => {
      throw new Error("upstream must not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const response = await postMcp({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "bulk_search_courses",
          arguments: { queries: Array.from({ length: 6 }, () => "course") },
        },
        id: 2,
      });
      const payload = await response.json();

      expect(payload.error.code).toBe(-32602);
      expect(payload.error.message).toStartWith("Invalid parameters: queries");
      expect(payload.error.data).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not expose exception text or stack traces", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const response = await postMcp({
      jsonrpc: "2.0",
      method: "not-a-method",
      id: 3,
    });
    const payload = await response.json();

    expect(payload.error).toEqual({
      code: -32603,
      message: "MCP request failed",
    });
    expect(payload.error.data).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("describes the all-courses resource as a bounded listing", async () => {
    const response = await postMcp({
      jsonrpc: "2.0",
      method: "resources/list",
      id: 4,
    });
    const payload = await response.json();
    const resource = payload.result.resources.find(
      (item: { uri: string }) => item.uri === "courseweb://courses/all",
    );

    expect(resource.description).toContain("up to 100");
  });
});
