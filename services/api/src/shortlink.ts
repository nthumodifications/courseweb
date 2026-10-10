import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";
import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";
import { getSafeShortlinkUrl } from "./utils/shortlink-url";

const MAX_SHORTLINK_URL_LENGTH = 8192;
const SHORTLINK_REQUEST_TIMEOUT_MS = 8_000;

const unavailable = () =>
  new Response(JSON.stringify({ error: "Short link service unavailable" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });

const endpoint = (key: string, accountID: string, namespaceID: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountID}/storage/kv/namespaces/${namespaceID}/values/${encodeURIComponent(key)}`;

async function digest(message: string, algo = "SHA-1") {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(algo, new TextEncoder().encode(message)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

// Only the routes that cost something are limited; reads stay open.
const shortlinkRateLimit = rateLimitMiddleware({
  limiter: "SHORTLINK_RATE_LIMITER",
  errorMessage: "Too many short link requests. Please try again in a minute.",
});

const app = new Hono<{ Bindings: Bindings }>()
  .put(
    "/",
    shortlinkRateLimit,
    zValidator(
      "query",
      z.object({
        url: z.string().max(MAX_SHORTLINK_URL_LENGTH),
      }),
    ),
    async (c) => {
      const { url } = c.req.valid("query");
      const safeUrl = getSafeShortlinkUrl(url);
      if (!safeUrl) {
        return c.json(
          { error: "Short links must target https://nthumods.com" },
          400,
        );
      }
      // use url md5 as key
      const key = await digest(safeUrl);
      const {
        CLOUDFLARE_WORKER_ACCOUNT_ID,
        CLOUDFLARE_KV_SHORTLINKS_NAMESPACE,
        CLOUDFLARE_KV_API_TOKEN,
      } = env<{
        CLOUDFLARE_WORKER_ACCOUNT_ID: string;
        CLOUDFLARE_KV_SHORTLINKS_NAMESPACE: string;
        CLOUDFLARE_KV_API_TOKEN: string;
      }>(c);

      // TTL: 2 months
      const ttl = 60 * 60 * 24 * 30 * 2;

      let res: { success?: boolean };
      try {
        const response = await fetch(
          endpoint(
            key,
            CLOUDFLARE_WORKER_ACCOUNT_ID,
            CLOUDFLARE_KV_SHORTLINKS_NAMESPACE,
          ) + `?expiration_ttl=${ttl}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${CLOUDFLARE_KV_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: safeUrl,
            signal: AbortSignal.timeout(SHORTLINK_REQUEST_TIMEOUT_MS),
          },
        );
        if (!response.ok) return unavailable();
        res = (await response.json()) as { success?: boolean };
      } catch {
        return unavailable();
      }

      if (!res.success) {
        return unavailable();
      }

      return c.text(`https://nthumods.com/l/${key}`);
    },
  )
  .get(
    "/:key",
    zValidator(
      "param",
      z.object({
        key: z.string().trim().min(1).max(128),
      }),
    ),
    async (c) => {
      const { key } = c.req.valid("param");
      const {
        CLOUDFLARE_WORKER_ACCOUNT_ID,
        CLOUDFLARE_KV_SHORTLINKS_NAMESPACE,
        CLOUDFLARE_KV_API_TOKEN,
      } = env<{
        CLOUDFLARE_WORKER_ACCOUNT_ID: string;
        CLOUDFLARE_KV_SHORTLINKS_NAMESPACE: string;
        CLOUDFLARE_KV_API_TOKEN: string;
      }>(c);
      let response: Response;
      try {
        response = await fetch(
          endpoint(
            key,
            CLOUDFLARE_WORKER_ACCOUNT_ID!,
            CLOUDFLARE_KV_SHORTLINKS_NAMESPACE!,
          ),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${CLOUDFLARE_KV_API_TOKEN}`,
              "Content-Type": "text/plain",
            },
            signal: AbortSignal.timeout(SHORTLINK_REQUEST_TIMEOUT_MS),
          },
        );
      } catch {
        return c.json({ error: "Short link service unavailable" }, 502);
      }
      if (!response.ok) {
        if (response.status === 404) {
          return c.json({ error: { message: "Link does not exist" } }, 404);
        }
        return c.json({ error: "Short link service unavailable" }, 502);
      }
      const text = await response.text();

      if (!text) {
        return c.json({ error: { message: "Link does not exist" } }, 404);
      }
      return c.text(text);
    },
  );

export default app;
