/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static assets - pass through
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      return env.ASSETS.fetch(request);
    }

    // Non-GET requests - pass through
    if (request.method !== "GET" && request.method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    // HTML navigation requests - serve index.html
    const accept = request.headers.get("Accept") ?? "";
    if (accept.includes("text/html")) {
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", url.origin).toString(), {
          method: "GET",
        }),
      );
    }

    // Default - pass through
    return env.ASSETS.fetch(request);
  },
};
