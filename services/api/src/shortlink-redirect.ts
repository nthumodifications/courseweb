import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

const endpoint = (key: string, accountID: string, namespaceID: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountID}/storage/kv/namespaces/${namespaceID}/values/${encodeURIComponent(key)}`;

const app = new Hono().get(
  "/:slug",
  zValidator("param", z.object({ slug: z.string() })),
  async (c) => {
    const { slug } = c.req.valid("param");
    const {
      CLOUDFLARE_WORKER_ACCOUNT_ID,
      CLOUDFLARE_KV_SHORTLINKS_NAMESPACE,
      CLOUDFLARE_KV_API_TOKEN,
    } = env<{
      CLOUDFLARE_WORKER_ACCOUNT_ID: string;
      CLOUDFLARE_KV_SHORTLINKS_NAMESPACE: string;
      CLOUDFLARE_KV_API_TOKEN: string;
    }>(c);

    const response = await fetch(
      endpoint(
        slug,
        CLOUDFLARE_WORKER_ACCOUNT_ID,
        CLOUDFLARE_KV_SHORTLINKS_NAMESPACE,
      ),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_KV_API_TOKEN}`,
          "Content-Type": "text/plain",
        },
      },
    );

    if (!response.ok) {
      return c.json({ error: { message: "Link does not exist" } }, 404);
    }

    const url = await response.text();

    if (!url) {
      return c.json({ error: { message: "Link does not exist" } }, 404);
    }

    // Validate URL is a safe http/https URL
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return c.json({ error: { message: "Invalid redirect URL" } }, 400);
      }
    } catch {
      return c.json({ error: { message: "Invalid redirect URL" } }, 400);
    }

    return c.redirect(url);
  },
);

export default app;
