import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

const endpoint = (key: string, accountID: string, namespaceID: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountID}/storage/kv/namespaces/${namespaceID}/values/${key}`;

async function digest(message: string, algo = "SHA-1") {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(algo, new TextEncoder().encode(message)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

const app = new Hono()
  .put(
    "/",
    zValidator(
      "query",
      z.object({
        url: z.string(),
      }),
    ),
    async (c) => {
      const { url } = c.req.valid("query");
      // use url md5 as key
      const key = await digest(url);
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
          body: url,
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
