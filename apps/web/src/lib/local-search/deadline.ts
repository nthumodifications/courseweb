export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export const fetchJsonWithDeadline = async <T>(
  url: RequestInfo | URL,
  timeoutMs: number,
  init?: RequestInit,
  fetchFn: FetchLike = defaultFetch,
  label = "Request",
): Promise<{ response: Response; data: T }> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchFn(url, { ...init, signal: controller.signal }),
      deadline,
    ]);
    const data =
      response.status === 304
        ? (undefined as T)
        : await Promise.race([response.json() as Promise<T>, deadline]);
    return { response, data };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};
