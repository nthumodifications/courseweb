export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
const defaultFetch: FetchLike = (input, init) => fetch(input, init);
const abortReason = (signal: AbortSignal) =>
  signal.reason ?? new Error("The operation was aborted");
const abortState = (caller?: AbortSignal | null) => {
  const controller = new AbortController();
  let cleanup = () => {};
  let rejectCaller: ((reason: unknown) => void) | undefined;
  const callerAbort = caller
    ? new Promise<never>((_, reject) => {
        rejectCaller = reject;
      })
    : undefined;
  if (caller) {
    const abort = () => {
      const reason = abortReason(caller);
      controller.abort(reason);
      rejectCaller?.(reason);
    };
    if (caller.aborted) abort();
    else {
      caller.addEventListener("abort", abort, { once: true });
      cleanup = () => caller.removeEventListener("abort", abort);
    }
  }
  return {
    signal: controller.signal,
    callerAbort,
    abort: () => controller.abort(),
    cleanup,
  };
};
const timer = (ms: number, label: string, abort: () => void) => {
  let id: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_, reject) => {
    id = setTimeout(() => {
      abort();
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return { promise, clear: () => id !== undefined && clearTimeout(id) };
};
const race = <T>(
  operation: Promise<T>,
  ...guards: Array<Promise<never> | undefined>
) =>
  Promise.race(
    [operation, ...guards].filter(Boolean) as Promise<unknown>[],
  ) as Promise<T>;
export const fetchJsonWithDeadline = async <T>(
  url: RequestInfo | URL,
  timeoutMs: number,
  init?: RequestInit,
  fetchFn: FetchLike = defaultFetch,
  label = "Request",
): Promise<{ response: Response; data: T }> => {
  const state = abortState(init?.signal);
  const timeout = timer(timeoutMs, label, state.abort);
  try {
    const response = await race(
      Promise.resolve().then(() =>
        fetchFn(url, { ...init, signal: state.signal }),
      ),
      timeout.promise,
      state.callerAbort,
    );
    const data =
      response.status === 304
        ? (undefined as T)
        : await race(
            Promise.resolve().then(() => response.json() as Promise<T>),
            timeout.promise,
            state.callerAbort,
          );
    return { response, data };
  } finally {
    timeout.clear();
    state.cleanup();
  }
};
export type StreamingTimeouts = {
  firstByteMs: number;
  idleMs: number;
  absoluteMs: number;
};
export const fetchJsonWithIdleTimeout = async <T>(
  url: RequestInfo | URL,
  limits: StreamingTimeouts,
  init?: RequestInit,
  fetchFn: FetchLike = defaultFetch,
  label = "Request",
): Promise<{ response: Response; data: T }> => {
  const state = abortState(init?.signal);
  const absolute = timer(limits.absoluteMs, label, state.abort);
  const firstByte = timer(limits.firstByteMs, label, state.abort);
  try {
    const response = await race(
      Promise.resolve().then(() =>
        fetchFn(url, { ...init, signal: state.signal }),
      ),
      firstByte.promise,
      state.callerAbort,
    );
    if (response.status === 304) return { response, data: undefined as T };
    if (!response.body?.getReader) {
      firstByte.clear();
      const data = await race(
        Promise.resolve().then(() => response.json() as Promise<T>),
        absolute.promise,
        state.callerAbort,
      );
      return { response, data };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let firstByteSeen = false;
    let idle: ReturnType<typeof timer> | undefined;
    try {
      while (true) {
        const result = await race(
          Promise.resolve().then(() => reader.read()),
          absolute.promise,
          firstByteSeen ? idle?.promise : firstByte.promise,
          state.callerAbort,
        );
        if (result.done) break;
        if (!result.value?.byteLength) continue;
        body += decoder.decode(result.value, { stream: true });
        if (!firstByteSeen) {
          firstByteSeen = true;
          firstByte.clear();
        }
        idle?.clear();
        idle = timer(limits.idleMs, label, state.abort);
      }
    } catch (error) {
      void reader.cancel();
      throw error;
    } finally {
      firstByte.clear();
      idle?.clear();
    }
    body += decoder.decode();
    return { response, data: JSON.parse(body) as T };
  } finally {
    absolute.clear();
    firstByte.clear();
    state.cleanup();
  }
};
