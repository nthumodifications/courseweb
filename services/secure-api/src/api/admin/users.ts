import { PrismaClient, type Prisma } from "@prisma/client";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAdmin } from "../../middleware/requireAdmin";
import { recordAdminAction } from "../../utils/adminAudit";
import { isBootstrapSuperuser } from "../../const/admin";
import type { AdminEnv } from "./env";

const prisma = new PrismaClient();

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(["USER", "ADMIN", "SUPERUSER"]).optional(),
  banned: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const publicFields = {
  id: true,
  userId: true,
  name: true,
  nameEn: true,
  email: true,
  inschool: true,
  role: true,
  banned: true,
  bannedReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const app = new Hono<AdminEnv>()
  // Directory search. The query matches a student ID, a name in either
  // language, or an email, because staff arrive with whichever one the report
  // they are acting on happened to mention.
  .get("/", zValidator("query", listQuery), async (c) => {
    const { q, role, banned, page, pageSize } = c.req.valid("query");

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(banned ? { banned: banned === "true" } : {}),
      ...(q
        ? {
            OR: [
              { userId: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { nameEn: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: publicFields,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return c.json({ total, page, pageSize, users });
  })

  // Everything attached to one account, for answering "why can this person
  // still see X" without opening a database console.
  .get("/:userId", async (c) => {
    const userId = c.req.param("userId");
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { userId },
      select: publicFields,
    });

    if (!user) return c.json({ error: "not_found" }, 404);

    const [sessions, tokens, apiKeys, shareTokens, consents] =
      await Promise.all([
        prisma.authSessions.findMany({
          where: { userId },
          select: {
            id: true,
            state: true,
            createdAt: true,
            authenticatedAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.token.findMany({
          where: { userId, expiresAt: { gt: now } },
          select: {
            id: true,
            type: true,
            clientId: true,
            scopes: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.apiKey.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            scopes: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            isRevoked: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.calendarShareToken.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            revokedAt: true,
            includeFullDetails: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.clientConsent.findMany({
          where: { userId },
          select: {
            id: true,
            clientId: true,
            scopes: true,
            grantedAt: true,
            updatedAt: true,
          },
        }),
      ]);

    return c.json({
      user,
      sessions,
      tokens,
      apiKeys,
      shareTokens,
      consents,
      bootstrapSuperuser: isBootstrapSuperuser(userId),
    });
  })

  // Granting staff access is the one action that can grant the power to grant
  // staff access, so it is held to SUPERUSER rather than ADMIN.
  .patch(
    "/:userId/role",
    requireAdmin("SUPERUSER"),
    zValidator(
      "json",
      z.object({ role: z.enum(["USER", "ADMIN", "SUPERUSER"]) }),
    ),
    async (c) => {
      const actor = c.get("user");
      const userId = c.req.param("userId");
      const { role } = c.req.valid("json");

      if (userId === actor.userId) {
        return c.json(
          {
            error: "invalid_request",
            error_description: "You cannot change your own role",
          },
          400,
        );
      }

      // The bootstrap account is re-promoted on its next sign-in anyway;
      // refusing here avoids recording a change that silently reverts.
      if (isBootstrapSuperuser(userId) && role !== "SUPERUSER") {
        return c.json(
          {
            error: "invalid_request",
            error_description:
              "This account is a bootstrap superuser and cannot be demoted",
          },
          400,
        );
      }

      const existing = await prisma.user.findUnique({ where: { userId } });
      if (!existing) return c.json({ error: "not_found" }, 404);

      const user = await prisma.user.update({
        where: { userId },
        data: { role },
        select: publicFields,
      });

      await recordAdminAction({
        actorId: actor.userId,
        action: "user.role.update",
        targetType: "user",
        targetId: userId,
        metadata: { from: existing.role, to: role },
      });

      return c.json(user);
    },
  )

  // Suspend or restore an account.
  .patch(
    "/:userId/ban",
    zValidator(
      "json",
      z.object({
        banned: z.boolean(),
        reason: z.string().trim().max(500).optional(),
      }),
    ),
    async (c) => {
      const actor = c.get("user");
      const userId = c.req.param("userId");
      const { banned, reason } = c.req.valid("json");

      if (userId === actor.userId) {
        return c.json(
          {
            error: "invalid_request",
            error_description: "You cannot ban yourself",
          },
          400,
        );
      }

      const existing = await prisma.user.findUnique({ where: { userId } });
      if (!existing) return c.json({ error: "not_found" }, 404);

      // An admin banning another admin is an escalation dressed as moderation.
      if (banned && existing.role !== "USER" && actor.role !== "SUPERUSER") {
        return c.json(
          {
            error: "forbidden",
            error_description: "Only a superuser can suspend an administrator",
          },
          403,
        );
      }

      const user = await prisma.user.update({
        where: { userId },
        data: { banned, bannedReason: banned ? (reason ?? null) : null },
        select: publicFields,
      });

      // A ban that leaves live tokens behind is not a ban for another 30 days.
      if (banned) {
        await prisma.token.deleteMany({ where: { userId } });
        await prisma.authSessions.deleteMany({ where: { userId } });
      }

      await recordAdminAction({
        actorId: actor.userId,
        action: banned ? "user.ban" : "user.unban",
        targetType: "user",
        targetId: userId,
        metadata: reason ? { reason } : {},
      });

      return c.json(user);
    },
  )

  // Sign an account out everywhere, without suspending it.
  .delete("/:userId/sessions", async (c) => {
    const actor = c.get("user");
    const userId = c.req.param("userId");

    const existing = await prisma.user.findUnique({ where: { userId } });
    if (!existing) return c.json({ error: "not_found" }, 404);

    const [tokens, sessions] = await Promise.all([
      prisma.token.deleteMany({ where: { userId } }),
      prisma.authSessions.deleteMany({ where: { userId } }),
    ]);

    await recordAdminAction({
      actorId: actor.userId,
      action: "user.sessions.revoke",
      targetType: "user",
      targetId: userId,
      metadata: { tokens: tokens.count, sessions: sessions.count },
    });

    return c.json({ tokens: tokens.count, sessions: sessions.count });
  });

export default app;
