import { PrismaClient, type Prisma } from "@prisma/client";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AdminEnv } from "./env";

const prisma = new PrismaClient();

/**
 * The admin audit trail, read-only on purpose.
 *
 * There is no delete or edit route here and there is not meant to be one: a
 * trail an admin can rewrite answers no question worth asking.
 */
const app = new Hono<AdminEnv>().get(
  "/",
  zValidator(
    "query",
    z.object({
      actorId: z.string().trim().max(50).optional(),
      action: z.string().trim().max(100).optional(),
      targetId: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }),
  ),
  async (c) => {
    const { actorId, action, targetId, page, pageSize } = c.req.valid("query");

    const where: Prisma.AdminAuditLogWhereInput = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action: { contains: action } } : {}),
      ...(targetId ? { targetId } : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { userId: true, name: true, nameEn: true } },
        },
      }),
    ]);

    return c.json({ total, page, pageSize, entries });
  },
);

export default app;
