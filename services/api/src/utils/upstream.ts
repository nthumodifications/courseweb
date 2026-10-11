export class UpstreamHttpError extends Error {
  constructor(public readonly response: Response) {
    super(`Upstream returned HTTP ${response.status}`);
    this.name = "UpstreamHttpError";
  }
}

export class UpstreamPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamPayloadError";
  }
}

export type FetchUpstreamOptions = {
  allowHtml?: boolean;
  fetcher?: typeof fetch;
};

const isHtml = (body: string): boolean =>
  /^(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(body.trim());

export async function fetchUpstream(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchUpstreamOptions = {},
): Promise<Response> {
  const response = await (options.fetcher ?? fetch)(input, init);
  if (!response.ok) throw new UpstreamHttpError(response);

  const body = await response.clone().text();
  if (!body.trim()) {
    throw new UpstreamPayloadError("Upstream returned an empty body");
  }
  if (
    !options.allowHtml &&
    (response.headers
      .get("Content-Type")
      ?.toLowerCase()
      .includes("text/html") ||
      isHtml(body))
  ) {
    throw new UpstreamPayloadError("Upstream returned an HTML error page");
  }
  return response;
}
