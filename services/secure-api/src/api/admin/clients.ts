import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAdmin } from "../../middleware/requireAdmin";
import { recordAdminAction } from "../../utils/adminAudit";
import { VALID_SCOPES } from "../../const/scopes";
import type { AdminEnv } from "./env";

const prisma = new PrismaClient();

/**
 * OAuth client registration.
 *
 * A registered client decides which redirect URIs can receive an authorization
 * code, so a careless edit here is an account-takeover primitive. The whole
 * router is SUPERUSER-only, and secrets are shown once at creation and never
 * read back.
 */

/**
 * What a client may be registered for.
 *
 * Two things are called a scope here. The consent scopes in VALID_SCOPES are
 * what a user is asked to approve; `introspect:<clientId>` is machine-to-machine
 * and is checked at /introspect, never shown to anyone. Both live in
 * Client.scopes, so a registration form that only accepted the first would make
 * the existing `nthumods-api` client uneditable without silently dropping the
 * only scope it has.
 */
const clientScope = z.union([
  z.enum(VALID_SCOPES),
  z
    .string()
    .regex(
      /^introspect:[A-Za-z0-9._-]{3,64}$/,
      "introspect scopes are written introspect:<clientId>",
    ),
]);

const clientBody = z.object({
  clientId: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "clientId may use letters, digits, . _ and -"),
  name: z.string().trim().max(100).nullish(),
  clientUri: z.string().trim().url().nullish(),
  firstParty: z.boolean().default(false),
  redirectUris: z.array(z.string().trim().url()).min(1).max(20),
  logoutUris: z.array(z.string().trim().url()).max(20).default([]),
  scopes: z.array(clientScope).min(1),
  confidential: z.boolean().default(false),
});

const publicFields = {
  id: true,
  clientId: true,
  name: true,
  clientUri: true,
  firstParty: true,
  redirectUris: true,
  logoutUris: true,
  scopes: true,
} as const;

const app = new Hono<AdminEnv>()
  .use("*", requireAdmin("SUPERUSER"))

  .get("/", async (c) => {
    const [clients, consents] = await Promise.all([
      prisma.client.findMany({
        select: { ...publicFields, clientSecret: true },
        orderBy: { clientId: "asc" },
      }),
      prisma.clientConsent.groupBy({
        by: ["clientId"],
        _count: { _all: true },
      }),
    ]);

    const consentCounts = new Map(
      consents.map((row) => [row.clientId, row._count._all]),
    );

    // The secret itself never leaves the server; whether one exists does, since
    // that is what tells a maintainer if the client is confidential or public.
    return c.json(
      clients.map(({ clientSecret, ...client }) => ({
        ...client,
        confidential: Boolean(clientSecret),
        consents: consentCounts.get(client.clientId) ?? 0,
      })),
    );
  })

  .post("/", zValidator("json", clientBody), async (c) => {
    const actor = c.get("user");
    const { confidential, ...body } = c.req.valid("json");

    const existing = await prisma.client.findUnique({
      where: { clientId: body.clientId },
    });
    if (existing) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "A client with that clientId already exists",
        },
        409,
      );
    }

    const clientSecret = confidential
      ? Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")
      : null;

    const client = await prisma.client.create({
      data: { ...body, clientSecret },
      select: publicFields,
    });

    await recordAdminAction({
      actorId: actor.userId,
      action: "client.create",
      targetType: "client",
      targetId: body.clientId,
      metadata: { firstParty: body.firstParty, confidential },
    });

    // The only time the secret is ever returned.
    return c.json({ ...client, clientSecret }, 201);
  })

  .patch(
    "/:clientId",
    zValidator("json", clientBody.omit({ clientId: true }).partial()),
    async (c) => {
      const actor = c.get("user");
      const clientId = c.req.param("clientId");
      const { confidential, ...body } = c.req.valid("json");

      const existing = await prisma.client.findUnique({ where: { clientId } });
      if (!existing) return c.json({ error: "not_found" }, 404);

      const client = await prisma.client.update({
        where: { clientId },
        data: body,
        select: publicFields,
      });

      await recordAdminAction({
        actorId: actor.userId,
        action: "client.update",
        targetType: "client",
        targetId: clientId,
        metadata: { fields: Object.keys(body) },
      });

      return c.json(client);
    },
  )

  // Rotating invalidates every deployment still holding the old secret, so it
  // is its own deliberate action rather than a side effect of an edit.
  .post("/:clientId/rotate-secret", async (c) => {
    const actor = c.get("user");
    const clientId = c.req.param("clientId");

    const existing = await prisma.client.findUnique({ where: { clientId } });
    if (!existing) return c.json({ error: "not_found" }, 404);

    const clientSecret = Buffer.from(
      crypto.getRandomValues(new Uint8Array(32)),
    ).toString("hex");

    await prisma.client.update({ where: { clientId }, data: { clientSecret } });

    await recordAdminAction({
      actorId: actor.userId,
      action: "client.rotate_secret",
      targetType: "client",
      targetId: clientId,
    });

    return c.json({ clientId, clientSecret });
  })

  .delete("/:clientId", async (c) => {
    const actor = c.get("user");
    const clientId = c.req.param("clientId");

    const existing = await prisma.client.findUnique({ where: { clientId } });
    if (!existing) return c.json({ error: "not_found" }, 404);

    // Deleting the client the admin center itself signs in through would lock
    // everyone out of the page they are standing on.
    if (existing.firstParty) {
      return c.json(
        {
          error: "invalid_request",
          error_description:
            "First-party clients cannot be deleted from the admin center",
        },
        400,
      );
    }

    await prisma.client.delete({ where: { clientId } });

    await recordAdminAction({
      actorId: actor.userId,
      action: "client.delete",
      targetType: "client",
      targetId: clientId,
      metadata: { name: existing.name ?? undefined },
    });

    return c.json({ deleted: true });
  });

export default app;
