import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

const endpoint = (key: string, accountID: string, namespaceID: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountID}/storage/kv/namespaces/${namespaceID}/values/${key}`;

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

    const url = await fetch(
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
    ).then((response) => response.text());

    if (!url) {
      return c.json({ error: { message: "Link does not exist" } }, 404);
    }

    return c.redirect(url);
  },
);

export default app;
