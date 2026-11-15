import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../../client";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

const statusQuery = z.object({
  status: z.enum(["reported", "resolved", "all"]).default("reported"),
});
const moderateInput = z
  .object({
    action: z.enum(["resolve", "hide_link", "ban_user"]),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
const reportIdParam = z.object({ reportId: z.string().uuid() });
const invalidInput = (result: { success: boolean }, c: any) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

export const createAdminClassPagesApp = ({
  db = prisma,
  audit = recordAdminAction,
}: {
  db?: typeof prisma;
  audit?: typeof recordAdminAction;
} = {}) =>
  new Hono<AdminEnv>()
    .get(
      "/reports",
      zValidator("query", statusQuery, invalidInput),
      async (c) => {
        const { status } = c.req.valid("query");
        const reports = await db.classPageReport.findMany({
          where:
            status === "reported"
              ? { resolvedAt: null }
              : status === "resolved"
                ? { resolvedAt: { not: null } }
                : {},
          orderBy: { createdAt: "desc" },
          include: {
            reporter: { select: { userId: true } },
            targetMembership: {
              include: {
                user: {
                  select: {
                    userId: true,
                    classProfile: { select: { displayName: true } },
                  },
                },
              },
            },
            targetLink: {
              include: {
                membership: { select: { semester: true, courseId: true } },
              },
            },
          },
        });
        return c.json({
          reports: reports.map((report: any) => ({
            id: report.id,
            targetType: report.targetType.toLowerCase(),
            reason: report.reason.toLowerCase(),
            note: report.note,
            createdAt: report.createdAt.toISOString(),
            resolvedAt: report.resolvedAt?.toISOString() ?? null,
            reporterId: report.reporter.userId,
            target:
              report.targetType === "MEMBER"
                ? {
                    displayName:
                      report.targetMembership?.user?.classProfile
                        ?.displayName ?? null,
                    userId:
                      report.targetUserId ??
                      report.targetMembership?.user?.userId ??
                      null,
                    semester: report.targetSemester,
                    courseId: report.targetCourseId,
                  }
                : {
                    label: report.targetLink?.label ?? null,
                    url: report.targetLink?.url ?? null,
                    authorId:
                      report.targetUserId ??
                      report.targetLink?.authorId ??
                      null,
                    semester: report.targetSemester,
                    courseId: report.targetCourseId,
                  },
          })),
        });
      },
    )
    .post(
      "/reports/:reportId/moderate",
      zValidator("param", reportIdParam, invalidInput),
      zValidator("json", moderateInput, invalidInput),
      async (c) => {
        const actor = c.get("user");
        const reportId = c.req.param("reportId");
        const { action, reason } = c.req.valid("json");
        const report = await db.classPageReport.findUnique({
          where: { id: reportId },
          include: {
            targetMembership: { select: { userId: true } },
            targetLink: { select: { id: true, authorId: true } },
          },
        });
        if (!report) return c.json({ error: "not_found" }, 404);
        if (action === "hide_link" && !report.targetLink)
          return c.json({ error: "invalid_action" }, 400);
        const targetUserId =
          report.targetUserId ??
          report.targetMembership?.userId ??
          report.targetLink?.authorId;
        if (
          action === "ban_user" &&
          (!targetUserId || targetUserId === actor.userId)
        ) {
          return c.json({ error: "invalid_action" }, 400);
        }
        if (action === "ban_user" && targetUserId) {
          const target = await db.user.findUnique({
            where: { userId: targetUserId },
            select: { role: true },
          });
          if (!target) return c.json({ error: "not_found" }, 404);
          if (target.role !== "USER" && actor.role !== "SUPERUSER")
            return c.json({ error: "forbidden" }, 403);
        }

        await db.$transaction(async (tx) => {
          if (action === "hide_link" && report.targetLink) {
            await tx.classPageLink.update({
              where: { id: report.targetLink.id },
              data: { status: "HIDDEN" },
            });
          }
          if (action === "ban_user" && targetUserId) {
            await tx.user.update({
              where: { userId: targetUserId },
              data: { banned: true, bannedReason: reason },
            });
            await tx.token.deleteMany({ where: { userId: targetUserId } });
            await tx.authSessions.deleteMany({
              where: { userId: targetUserId },
            });
          }
          await tx.classPageReport.update({
            where: { id: reportId },
            data: { resolvedAt: new Date(), resolvedById: actor.userId },
          });
        });

        await audit({
          actorId: actor.userId,
          action:
            action === "ban_user" ? "user.ban" : `class_page.report.${action}`,
          targetType: action === "ban_user" ? "user" : "class_page_report",
          targetId: action === "ban_user" ? targetUserId : reportId,
          metadata: { reportId, reason },
        });
        return c.json({ ok: true });
      },
    );

export default createAdminClassPagesApp();
