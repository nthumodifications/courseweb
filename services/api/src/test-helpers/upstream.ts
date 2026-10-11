export const upstreamFailureCases = [
  ["5xx", () => new Response("down", { status: 503 })],
  ["empty body", () => new Response("")],
  ["HTML error page", () => new Response("<html>error</html>")],
  ["timeout", () => new Error("timeout")],
] as const;

export const failingFetch = (
  makeResult: () => Response | Error,
): typeof fetch =>
  (async () => {
    const result = makeResult();
    if (result instanceof Error) throw result;
    return result;
  }) as unknown as typeof fetch;
