import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../../client";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

const idSchema = z.string().uuid();
const lockInput = z
  .object({
    locked: z.boolean(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
const revertInput = z
  .object({
    revisionId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const toAdminEntry = (entry: {
  id: string;
  identityType: string;
  identityKey: string;
  language: string;
  shortName: string;
  locked: boolean;
  updatedAt: Date;
  updatedById: string;
  revisions: Array<{
    id: string;
    editorId: string;
    shortName: string;
    action: string;
    createdAt: Date;
  }>;
}) => ({
  id: entry.id,
  identityType: entry.identityType.toLowerCase(),
  identityKey: entry.identityKey,
  language: entry.language.toLowerCase(),
  shortName: entry.shortName,
  locked: entry.locked,
  updatedAt: entry.updatedAt.toISOString(),
  updatedById: entry.updatedById,
  revisions: entry.revisions.map((revision) => ({
    id: revision.id,
    editorId: revision.editorId,
    shortName: revision.shortName,
    action: revision.action.toLowerCase(),
    createdAt: revision.createdAt.toISOString(),
  })),
});

const app = new Hono<AdminEnv>()
  .get("/", async (c) => {
    const entries = await prisma.courseShortName.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        revisions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            editorId: true,
            shortName: true,
            action: true,
            createdAt: true,
          },
        },
      },
    });
    return c.json({ entries: entries.map(toAdminEntry) });
  })
  .post(
    "/:id/lock",
    zValidator("param", z.object({ id: idSchema }), invalidInput),
    zValidator("json", lockInput, invalidInput),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.valid("param").id;
      const { locked, reason } = c.req.valid("json");
      const entry = await prisma.courseShortName.updateMany({
        where: { id },
        data: { locked },
      });
      if (entry.count === 0) return c.json({ error: "not_found" }, 404);
      await recordAdminAction({
        actorId: actor.userId,
        action: locked ? "course_short_name.lock" : "course_short_name.unlock",
        targetType: "course_short_name",
        targetId: id,
        metadata: { reason },
      });
      return c.json({ ok: true, locked });
    },
  )
  .post(
    "/:id/revert",
    zValidator("param", z.object({ id: idSchema }), invalidInput),
    zValidator("json", revertInput, invalidInput),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.valid("param").id;
      const { revisionId, reason } = c.req.valid("json");
      const result = await prisma.$transaction(async (tx) => {
        const entry = await tx.courseShortName.findUnique({ where: { id } });
        if (!entry) return null;
        const revision = await tx.courseShortNameRevision.findFirst({
          where: { id: revisionId, entryId: id },
        });
        if (!revision) return false;
        const updated = await tx.courseShortName.update({
          where: { id },
          data: { shortName: revision.shortName, updatedById: actor.userId },
        });
        await tx.courseShortNameRevision.create({
          data: {
            entryId: id,
            editorId: actor.userId,
            shortName: revision.shortName,
            action: "REVERT",
          },
        });
        return updated;
      });
      if (result === null) return c.json({ error: "not_found" }, 404);
      if (result === false) return c.json({ error: "revision_not_found" }, 404);
      await recordAdminAction({
        actorId: actor.userId,
        action: "course_short_name.revert",
        targetType: "course_short_name",
        targetId: id,
        metadata: { revisionId, reason },
      });
      return c.json({ entry: toAdminEntry({ ...result, revisions: [] }) });
    },
  );

export default app;
