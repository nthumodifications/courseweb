import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import prisma from "../../client";
import { recordAdminAction } from "../../utils/adminAudit";
import { toPublicReview } from "../reviews";
import type { AdminEnv } from "./env";

const statusQuery = z.object({
  status: z.enum(["reported", "hidden", "removed", "all"]).default("reported"),
});

const moderateInput = z.object({
  action: z.enum(["restore", "hide", "remove"]),
  reason: z.string().trim().min(1).max(500),
});

const adminReviewStatus = (status: string) => status.toLowerCase();

const toAdminReview = (review: {
  id: string;
  userId: string;
  moduleKey: string;
  instructor: string;
  semester: string;
  workload: number;
  grading: number;
  learning: number;
  attendance: string;
  examStyle: string[];
  body: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reports?: Array<{
    id: string;
    reason: string;
    note: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
}) => ({
  ...toPublicReview(review, false),
  status: adminReviewStatus(review.status),
  authorId: review.userId,
  reports: (review.reports ?? []).map((report) => ({
    id: report.id,
    reason: report.reason.toLowerCase(),
    note: report.note,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
  })),
});

const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const app = new Hono<AdminEnv>()
  .get("/", zValidator("query", statusQuery, invalidInput), async (c) => {
    const { status } = c.req.valid("query");
    const where =
      status === "reported"
        ? { reports: { some: { resolvedAt: null } } }
        : status === "all"
          ? {}
          : { status: status.toUpperCase() as "HIDDEN" | "REMOVED" };
    const reviews = await prisma.courseReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reports: {
          select: {
            id: true,
            reason: true,
            note: true,
            createdAt: true,
            resolvedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return c.json({ reviews: reviews.map(toAdminReview) });
  })
  .post(
    "/:id/moderate",
    zValidator("json", moderateInput, invalidInput),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.param("id");
      const { action, reason } = c.req.valid("json");

      const status =
        action === "restore"
          ? "VISIBLE"
          : action === "hide"
            ? "HIDDEN"
            : "REMOVED";
      const review = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "CourseReview"
          WHERE "id" = ${id}
          FOR UPDATE
        `;
        if (locked.length === 0) return null;

        const updated = await tx.courseReview.update({
          where: { id },
          data: { status },
        });
        await tx.courseReviewReport.updateMany({
          where: { reviewId: id, resolvedAt: null },
          data: { resolvedAt: new Date(), resolvedById: actor.userId },
        });
        return updated;
      });
      if (!review) return c.json({ error: "not_found" }, 404);

      await recordAdminAction({
        actorId: actor.userId,
        action: "course_review.moderate",
        targetType: "course_review",
        targetId: id,
        metadata: { action, reason },
      });

      return c.json({ review: toAdminReview({ ...review, reports: [] }) });
    },
  )
  .post("/reports/:reportId/dismiss", async (c) => {
    const actor = c.get("user");
    const reportId = c.req.param("reportId");
    const result = await prisma.courseReviewReport.updateMany({
      where: { id: reportId, resolvedAt: null },
      data: { resolvedAt: new Date(), resolvedById: actor.userId },
    });
    if (result.count === 0) return c.json({ error: "not_found" }, 404);

    await recordAdminAction({
      actorId: actor.userId,
      action: "course_review.report.dismiss",
      targetType: "course_review_report",
      targetId: reportId,
    });
    return c.json({ ok: true });
  });

export default app;
