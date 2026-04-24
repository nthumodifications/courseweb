/// <reference types="@cloudflare/workers-types" />

/**
 * Emergency minimal worker for NTHUMods.
 * Priority: stabilize SPA routing first.
 * SEO enhancements can be re-added after stability confirmed.
 */

interface Env {
  ASSETS: Fetcher;
}

function isAssetPath(pathname: string): boolean {
  // Paths with file extensions are static assets
  return /\.[a-z0-9]+$/i.test(pathname);
}

function isHtmlNavigation(request: Request): boolean {
  // Browser navigations that want HTML
  const method = request.method;
  const accept = request.headers.get("Accept") ?? "";
  return (
    (method === "GET" || method === "HEAD") && accept.includes("text/html")
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1) Static assets: pass through as-is
    if (isAssetPath(pathname)) {
      return env.ASSETS.fetch(request);
    }

    // 2) HTML navigation requests: serve SPA shell (index.html)
    if (isHtmlNavigation(request)) {
      try {
        const indexResponse = await env.ASSETS.fetch(
          new Request(new URL("/index.html", url.origin).toString(), {
            method: "GET",
          }),
        );
        // Return the SPA shell for all HTML nav requests
        return indexResponse;
      } catch {
        // If index.html fetch fails, pass through to asset handler
        return env.ASSETS.fetch(request);
      }
    }

    // 3) Everything else: pass through
    return env.ASSETS.fetch(request);
  },
};
