import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";
import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";
import { getSafeShortlinkUrl } from "./utils/shortlink-url";

const MAX_SHORTLINK_URL_LENGTH = 8192;

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

      const res = await fetch(
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
        },
      ).then((response) => response.json() as any);

      if (!res.success) {
        throw new Error("Failed to create short link");
      }

      return c.text(`https://nthumods.com/l/${key}`);
    },
  )
  .get(
    "/:key",
    zValidator(
      "param",
      z.object({
        key: z.string(),
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
      const text = await fetch(
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
        },
      ).then((response) => response.text());

      if (!text) {
        throw new Error("Short link not found");
      }
      return c.text(text);
    },
  );

export default app;
