/**
 * Test utilities for working with Bun's test suite
 */
/**
 * Creates a fetch mock that can be configured to return different responses based on URL and options
 *
 * @param mockResponses An object mapping URL patterns to response factories
 * @returns A mock fetch function
 */
export declare function createFetchMock(
  mockResponses: Record<
    string,
    (url: string, options?: RequestInit) => Promise<Response>
  >,
): (input: RequestInfo | URL, options?: RequestInit) => Promise<Response>;
/**
 * Helper to create a mock response with JSON data
 *
 * @param data The data to include in the response
 * @param options Optional response configuration
 * @returns A Response object
 */
export declare function mockJsonResponse(
  data: any,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  },
): Response;
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
export declare function setupFetchMock(
  mockResponses: Record<
    string,
    (url: string, options?: RequestInit) => Promise<Response>
  >,
): {
  restore: () => void;
};
