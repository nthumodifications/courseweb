/**
 * Test utilities for working with Bun's test suite
 */

/**
 * Creates a fetch mock that can be configured to return different responses based on URL and options
 *
 * @param mockResponses An object mapping URL patterns to response factories
 * @returns A mock fetch function
 */
export function createFetchMock(
  mockResponses: Record<
    string,
    (url: string, options?: RequestInit) => Promise<Response>
  >,
) {
  return async (
    input: RequestInfo | URL,
    options?: RequestInit,
  ): Promise<Response> => {
    const url =
      input instanceof URL
        ? input.toString()
        : typeof input === "string"
          ? input
          : input.url;
    // Find a matching URL pattern
    for (const [pattern, responseFn] of Object.entries(mockResponses)) {
      if (url.includes(pattern)) {
        return responseFn(url, options);
      }
    }

    // Default response if no pattern matches
    return new Response(
      JSON.stringify({ error: "No mock response configured for this URL" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
}

/**
 * Helper to create a mock response with JSON data
 *
 * @param data The data to include in the response
 * @param options Optional response configuration
 * @returns A Response object
 */
export function mockJsonResponse(
  data: any,
  options?: { status?: number; headers?: Record<string, string> },
) {
  return new Response(JSON.stringify(data), {
    status: options?.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
}

/**
 * Setup and restore fetch mocks easily
 *
 * @example
 * const mockFetch = setupFetchMock({
 *   'api.example.com': (url) => mockJsonResponse({ success: true })
 * });
 *
 * // Run your tests...
 *
 * mockFetch.restore();
 */
export function setupFetchMock(
  mockResponses: Record<
    string,
    (url: string, options?: RequestInit) => Promise<Response>
  >,
) {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock(mockResponses);

  return {
    restore: () => {
      global.fetch = originalFetch;
    },
  };
}
