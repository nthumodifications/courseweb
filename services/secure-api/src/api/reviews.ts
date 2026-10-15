import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import type {
  CourseReviewReportReason,
  CourseReviewSource,
  CourseReviewStatus,
  User,
} from "@prisma/client";
import prisma from "../client";

const DAY_MS = 24 * 60 * 60 * 1000;

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/gu, " ");

const moduleKeySchema = z
  .string()
  .transform((value) => {
    const separator = value.indexOf(":");
    if (separator < 1 || separator === value.length - 1) return value;
    return `${normalizePart(value.slice(0, separator))}:${normalizePart(
      value.slice(separator + 1),
    ).replace(/\s+/gu, "")}`;
  })
  .refine((value) => {
    const separator = value.indexOf(":");
    return (
      separator > 0 &&
      separator < value.length - 1 &&
      normalizePart(value.slice(0, separator)).length > 0 &&
      normalizePart(value.slice(separator + 1)).length > 0 &&
      value.length <= 40
    );
  });

const instructorSchema = z
  .string()
  .transform(normalizePart)
  .pipe(z.string().min(1).max(80));

const semesterSchema = z
  .string()
  .regex(/^\d{5}$/u)
  .refine((value) => ["1", "2", "3"].includes(value[3]!));

const ratingSchema = z.number().int().min(1).max(5);
const attendanceSchema = z.enum(["none", "sometimes", "every_class"]);
const examStyleSchema = z
  .array(z.enum(["written", "oral", "project", "report", "none"]))
  .min(1)
  .max(5)
  .refine((styles) => new Set(styles).size === styles.length);

const reviewInput = z.object({
  moduleKey: moduleKeySchema,
  instructor: instructorSchema,
  semester: semesterSchema,
  coolness: ratingSchema,
  sweetness: ratingSchema,
  learning: ratingSchema,
  attendance: attendanceSchema,
  examStyle: examStyleSchema,
  body: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (value.length >= 30 && value.length <= 3000),
    ),
});

const patchInput = reviewInput
  .omit({ moduleKey: true, instructor: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const queryInput = z.object({
  moduleKey: moduleKeySchema.optional(),
  instructor: instructorSchema.optional(),
});

const reportInput = z.object({
  reason: z.enum([
    "personal_attack",
    "exam_leak",
    "spam",
    "off_topic",
    "other",
  ]),
  note: z.string().trim().max(500).optional(),
});

const invalidInput = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const iso = (value: Date) => value.toISOString();

const edited = (createdAt: Date, updatedAt: Date) =>
  updatedAt.getTime() - createdAt.getTime() > 60_000;

export const toPublicReview = (
  review: {
    id: string;
    moduleKey: string;
    instructor: string;
    semester: string | null;
    coolness: number | null;
    sweetness: number | null;
    learning: number | null;
    attendance: string | null;
    examStyle: string[];
    body: string;
    source: CourseReviewSource | string;
    sourceUrl: string | null;
    sourceAuthor: string | null;
    sourcePostedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  mine: boolean,
) => ({
  id: review.id,
  moduleKey: review.moduleKey,
  instructor: review.instructor,
  semester: review.semester,
  coolness: review.coolness,
  sweetness: review.sweetness,
  learning: review.learning,
  attendance: review.attendance,
  examStyle: review.examStyle,
  body: review.body,
  source: review.source.toLowerCase(),
  sourceUrl: review.sourceUrl,
  sourceAuthor: review.sourceAuthor,
  sourcePostedAt: review.sourcePostedAt ? iso(review.sourcePostedAt) : null,
  createdAt: iso(review.createdAt),
  updatedAt: iso(review.updatedAt),
  edited: edited(review.createdAt, review.updatedAt),
  mine: review.source === "NATIVE" && mine,
});

const toMineReview = (
  review: Parameters<typeof toPublicReview>[0] & {
    userId: string | null;
    status: string;
  },
) => ({
  ...toPublicReview(review, true),
  status: review.status.toLowerCase(),
});

const roundAverage = (value: number | null | undefined) =>
  value == null ? null : Math.round(value * 10) / 10;

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

type LockedReview = {
  id: string;
  userId: string | null;
  moduleKey: string;
  instructor: string;
  semester: string | null;
  coolness: number | null;
  sweetness: number | null;
  learning: number | null;
  attendance: string | null;
  examStyle: string[];
  body: string;
  source: CourseReviewSource;
  sourceUrl: string | null;
  sourceAuthor: string | null;
  sourcePostedAt: Date | null;
  status: CourseReviewStatus;
  createdAt: Date;
  updatedAt: Date;
};

export const reviewSortTimestamp = (review: {
  sourcePostedAt: Date | null;
  createdAt: Date;
}) => (review.sourcePostedAt ?? review.createdAt).getTime();

export const sortReviewsNewestFirst = <
  T extends {
    sourcePostedAt: Date | null;
    createdAt: Date;
  },
>(
  reviews: T[],
) =>
  reviews.sort(
    (left, right) => reviewSortTimestamp(right) - reviewSortTimestamp(left),
  );

const rejectBanned = (c: {
  get: (key: "user") => { banned: boolean };
  json: Function;
}) => {
  if (c.get("user").banned) return c.json({ error: "banned" }, 403);
};

const rejectBannedMiddleware: MiddlewareHandler = async (c, next) => {
  const banned = rejectBanned(c);
  if (banned) return banned;
  return next();
};

type ReviewAppDependencies = {
  auth?: MiddlewareHandler;
  writeAuth?: MiddlewareHandler;
  optionalAuth?: (c: Context) => Promise<User | undefined>;
};

const lazyRequireAuth = (
  scopes: string[] = [],
  options: { allowBanned?: boolean } = {},
) =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return requireAuth(scopes, options)(c, next);
  }) as MiddlewareHandler;

const lazyOptionalAuth = async (c: Context) => {
  const { getOptionalAuthUser } = await import("../middleware/requireAuth");
  return getOptionalAuthUser(c);
};

export const createReviewsApp = ({
  auth = lazyRequireAuth(),
  writeAuth = lazyRequireAuth([], { allowBanned: true }),
  optionalAuth = lazyOptionalAuth,
}: ReviewAppDependencies = {}) =>
  new Hono()
    .get("/", zValidator("query", queryInput, invalidInput), async (c) => {
      const { moduleKey, instructor } = c.req.valid("query");
      if (!moduleKey && !instructor)
        return c.json({ error: "missing_target" }, 400);

      const where = {
        status: "VISIBLE" as const,
        ...(moduleKey ? { moduleKey } : {}),
        ...(instructor ? { instructor } : {}),
      };
      const user = await optionalAuth(c);
      const [reviews, count, averages] = await Promise.all([
        prisma.courseReview.findMany({
          where,
          orderBy: { createdAt: "desc" },
        }),
        prisma.courseReview.count({ where }),
        prisma.courseReview.aggregate({
          where,
          _avg: { coolness: true, sweetness: true, learning: true },
          _count: { coolness: true, sweetness: true, learning: true },
        }),
      ]);

      sortReviewsNewestFirst(reviews);

      return c.json({
        reviews: reviews
          .slice(0, 100)
          .map((review) =>
            toPublicReview(review, user?.userId === review.userId),
          ),
        summary: {
          count,
          coolness:
            averages._count.coolness < 3
              ? null
              : roundAverage(averages._avg.coolness),
          sweetness:
            averages._count.sweetness < 3
              ? null
              : roundAverage(averages._avg.sweetness),
          learning:
            averages._count.learning < 3
              ? null
              : roundAverage(averages._avg.learning),
        },
      });
    })
    .get("/mine", auth, async (c) => {
      const user = c.get("user");
      const reviews = await prisma.courseReview.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: "desc" },
      });
      return c.json({ reviews: reviews.map(toMineReview) });
    })
    .post(
      "/",
      writeAuth,
      rejectBannedMiddleware,
      zValidator("json", reviewInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const input = c.req.valid("json");
        const since = new Date(Date.now() - DAY_MS);
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Advisory locks return PostgreSQL void, which Prisma cannot deserialize via $queryRaw.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.userId}))`;

            const recent = await tx.courseReview.count({
              where: { userId: user.userId, createdAt: { gte: since } },
            });
            if (recent >= 5) return { kind: "rate_limited" as const };

            const existing = await tx.courseReview.findFirst({
              where: {
                userId: user.userId,
                moduleKey: input.moduleKey,
                instructor: input.instructor,
              },
              select: { id: true },
            });
            if (existing)
              return { kind: "duplicate" as const, id: existing.id };

            const review = await tx.courseReview.create({
              data: { ...input, userId: user.userId },
            });
            return { kind: "created" as const, review };
          });

          if (result.kind === "rate_limited")
            return c.json({ error: "rate_limited" }, 429);
          if (result.kind === "duplicate")
            return c.json({ error: "already_reviewed", id: result.id }, 409);
          return c.json({ review: toPublicReview(result.review, true) }, 201);
        } catch (error) {
          if (isUniqueViolation(error)) {
            const duplicate = await prisma.courseReview.findFirst({
              where: {
                userId: user.userId,
                moduleKey: input.moduleKey,
                instructor: input.instructor,
              },
              select: { id: true },
            });
            return c.json(
              { error: "already_reviewed", id: duplicate?.id ?? "" },
              409,
            );
          }
          throw error;
        }
      },
    )
    .patch(
      "/:id",
      writeAuth,
      zValidator("json", patchInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const existing = await prisma.courseReview.findFirst({
          where: { id: c.req.param("id"), userId: user.userId },
        });
        if (!existing) return c.json({ error: "not_found" }, 404);
        const banned = rejectBanned(c);
        if (banned) return banned;

        const result = await prisma.$transaction(async (tx) => {
          const lockedReviews = await tx.$queryRaw<LockedReview[]>`
            SELECT "id", "userId", "moduleKey", "instructor", "semester",
                   "coolness", "sweetness", "learning", "attendance", "examStyle",
                   "body", "source", "sourceUrl", "sourceAuthor", "sourcePostedAt",
                   "status", "createdAt", "updatedAt"
            FROM "CourseReview"
            WHERE "id" = ${existing.id}
            FOR UPDATE
          `;
          const review = lockedReviews[0];
          if (!review || review.userId !== user.userId)
            return { kind: "not_found" as const };
          if (review.status === "REMOVED") return { kind: "removed" as const };

          return {
            kind: "updated" as const,
            review: await tx.courseReview.update({
              where: { id: review.id },
              data: c.req.valid("json"),
            }),
          };
        });
        if (result.kind === "not_found")
          return c.json({ error: "not_found" }, 404);
        if (result.kind === "removed") return c.json({ error: "removed" }, 409);
        return c.json({ review: toPublicReview(result.review, true) });
      },
    )
    .delete("/:id", writeAuth, async (c) => {
      const user = c.get("user");
      const existing = await prisma.courseReview.findFirst({
        where: { id: c.req.param("id"), userId: user.userId },
        select: { id: true },
      });
      if (!existing) return c.json({ error: "not_found" }, 404);
      await prisma.courseReview.delete({ where: { id: existing.id } });
      return new Response(null, { status: 204 });
    })
    .post(
      "/:id/report",
      writeAuth,
      rejectBannedMiddleware,
      zValidator("json", reportInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const reviewId = c.req.param("id")!;
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Advisory locks return PostgreSQL void, which Prisma cannot deserialize via $queryRaw.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.userId}))`;

            const lockedReviews = await tx.$queryRaw<LockedReview[]>`
              SELECT "id", "userId", "moduleKey", "instructor", "semester",
                     "coolness", "sweetness", "learning", "attendance", "examStyle",
                     "body", "source", "sourceUrl", "sourceAuthor", "sourcePostedAt",
                     "status", "createdAt", "updatedAt"
              FROM "CourseReview"
              WHERE "id" = ${reviewId}
              FOR UPDATE
            `;
            const review = lockedReviews[0];
            if (!review || review.status === "REMOVED")
              return { kind: "not_found" as const };
            if (review.userId === user.userId)
              return { kind: "own_review" as const };

            const existing = await tx.courseReviewReport.findUnique({
              where: {
                reviewId_reporterId: { reviewId, reporterId: user.userId },
              },
            });
            if (existing) return { kind: "ok" as const };

            const recent = await tx.courseReviewReport.count({
              where: {
                reporterId: user.userId,
                createdAt: { gte: new Date(Date.now() - DAY_MS) },
              },
            });
            if (recent >= 20) return { kind: "rate_limited" as const };

            await tx.courseReviewReport.create({
              data: {
                ...c.req.valid("json"),
                reason: c.req
                  .valid("json")
                  .reason.toUpperCase() as CourseReviewReportReason,
                reviewId,
                reporterId: user.userId,
              },
            });
            const openReports = await tx.courseReviewReport.count({
              where: { reviewId, resolvedAt: null },
            });
            if (openReports >= 3) {
              await tx.courseReview.updateMany({
                where: { id: reviewId, status: "VISIBLE" },
                data: { status: "HIDDEN" },
              });
            }
            return { kind: "ok" as const };
          });

          if (result.kind === "not_found")
            return c.json({ error: "not_found" }, 404);
          if (result.kind === "own_review")
            return c.json({ error: "own_review" }, 400);
          if (result.kind === "rate_limited")
            return c.json({ error: "rate_limited" }, 429);
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
        return c.json({ ok: true }, 202);
      },
    );

export default createReviewsApp();
