import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../../client";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

const reasonInput = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();
const statusInput = reasonInput.extend({
  status: z.enum(["VISIBLE", "HIDDEN"]),
});
const officialInput = reasonInput.extend({ official: z.boolean() });
const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};
const serializeReport = (report: {
  id: string;
  templateId: string;
  reason: string;
  note: string | null;
  reporterId: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedById: string | null;
}) => ({
  id: report.id,
  templateId: report.templateId,
  reason: report.reason.toLowerCase(),
  note: report.note,
  reporterId: report.reporterId,
  createdAt: report.createdAt.toISOString(),
  resolvedAt: report.resolvedAt?.toISOString() ?? null,
  resolvedById: report.resolvedById,
});

const app = new Hono<AdminEnv>()
  .get("/", async () => {
    const templates = await prisma.plannerTemplate.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        reports: { orderBy: { createdAt: "desc" } },
        _count: { select: { reports: { where: { resolvedAt: null } } } },
      },
    });
    return Response.json({
      templates: templates.map((template) => ({
        id: template.id,
        authorId: template.authorId,
        title: template.title,
        description: template.description,
        department: template.department,
        entranceYear: template.entranceYear,
        requiredCredits: template.requiredCredits,
        folderCount: template.folderCount,
        courseCount: template.courseCount,
        official: template.official,
        status: template.status.toLowerCase(),
        useCount: template.useCount,
        updatedAt: template.updatedAt.toISOString(),
        openReportCount: template._count.reports,
        reports: template.reports.map(serializeReport),
      })),
    });
  })
  .post(
    "/:id/status",
    zValidator("json", statusInput, invalidInput),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.param("id");
      const { status, reason } = c.req.valid("json");
      const updated = await prisma.plannerTemplate.updateMany({
        where: { id },
        data: { status },
      });
      if (updated.count === 0) return c.json({ error: "not_found" }, 404);
      await recordAdminAction({
        actorId: actor.userId,
        action:
          status === "HIDDEN"
            ? "planner_template.hide"
            : "planner_template.unhide",
        targetType: "planner_template",
        targetId: id,
        metadata: { reason },
      });
      return c.json({ ok: true, status: status.toLowerCase() });
    },
  )
  .post(
    "/:id/official",
    zValidator("json", officialInput, invalidInput),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.param("id");
      const { official, reason } = c.req.valid("json");
      const updated = await prisma.plannerTemplate.updateMany({
        where: { id },
        data: { official },
      });
      if (updated.count === 0) return c.json({ error: "not_found" }, 404);
      await recordAdminAction({
        actorId: actor.userId,
        action: "planner_template.set_official",
        targetType: "planner_template",
        targetId: id,
        metadata: { official, reason },
      });
      return c.json({ ok: true, official });
    },
  )
  .post("/reports/:reportId/resolve", async (c) => {
    const actor = c.get("user");
    const reportId = c.req.param("reportId");
    const updated = await prisma.plannerTemplateReport.updateMany({
      where: { id: reportId, resolvedAt: null },
      data: { resolvedAt: new Date(), resolvedById: actor.userId },
    });
    if (updated.count === 0) return c.json({ error: "not_found" }, 404);
    await recordAdminAction({
      actorId: actor.userId,
      action: "planner_template.report.resolve",
      targetType: "planner_template_report",
      targetId: reportId,
    });
    return c.json({ ok: true });
  });

export default app;
