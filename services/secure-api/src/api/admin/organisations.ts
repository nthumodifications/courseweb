import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../../client";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

const statusQuery = z.object({
  status: z
    .enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED", "ALL"])
    .default("PENDING"),
});
const statusInput = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().min(1).max(1000),
});
const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

export const createAdminOrganisationsApp = ({
  db = prisma,
  audit = recordAdminAction,
}: {
  db?: typeof prisma;
  audit?: typeof recordAdminAction;
} = {}) =>
  new Hono<AdminEnv>()
    .get("/", zValidator("query", statusQuery, invalidInput), async (c) => {
      const { status } = c.req.valid("query");
      const organisations = await db.organisation.findMany({
        where: status === "ALL" ? {} : { status },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          contact: true,
          status: true,
          createdAt: true,
          creator: { select: { userId: true, name: true, email: true } },
          members: {
            include: {
              user: { select: { userId: true, name: true, email: true } },
            },
          },
          spaces: {
            select: {
              id: true,
              name: true,
              slug: true,
              isPublic: true,
              archivedAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return c.json({ organisations });
    })
    .post(
      "/:id/status",
      zValidator("json", statusInput, invalidInput),
      async (c) => {
        const actor = c.get("user");
        const id = c.req.param("id");
        const { status, reason } = c.req.valid("json");
        const result = await db.organisation.updateMany({
          where: { id },
          data: { status },
        });
        if (!result.count) return c.json({ error: "not_found" }, 404);
        await audit({
          actorId: actor.userId,
          action: "space_organisation.status",
          targetType: "organisation",
          targetId: id,
          metadata: { status, reason },
        });
        return c.json({ ok: true, status });
      },
    );

export default createAdminOrganisationsApp();
