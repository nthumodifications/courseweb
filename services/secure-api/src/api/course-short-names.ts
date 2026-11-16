import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import prisma from "../client";

const DAY_MS = 24 * 60 * 60 * 1000;
export const COURSE_SHORT_NAME_DAILY_LIMIT = 12;

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/gu, " ");

export const sanitizeCourseShortName = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/[<>]/gu, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

const moduleKeySchema = z
  .string()
  .transform((value) => {
    const separator = value.indexOf(":");
    if (separator < 1 || separator === value.length - 1) return value;
    return `${normalizePart(value.slice(0, separator)).toLocaleUpperCase("en-US")}:${normalizePart(
      value.slice(separator + 1),
    ).replace(/\s+/gu, "")}`;
  })
  .refine((value) => {
    const separator = value.indexOf(":");
    return separator > 0 && separator < value.length - 1 && value.length <= 40;
  });

const courseCodeSchema = z
  .string()
  .transform((value) =>
    value.normalize("NFKC").replace(/\s+/gu, "").toUpperCase(),
  )
  .pipe(z.string().regex(/^[A-Z]{1,8}\d{2,8}$/u));

const targetFields = z.object({
  moduleKey: moduleKeySchema.optional(),
  courseCode: courseCodeSchema.optional(),
});
type ShortNameEnv = {
  Variables: { user: { userId: string; banned: boolean } };
};

const languageSchema = z.enum(["zh", "en"]);
const shortNameSchema = z
  .string()
  .transform(sanitizeCourseShortName)
  .refine((value) => value.length > 0 && [...value].length <= 32);

const editInput = targetFields
  .extend({
    language: languageSchema,
    shortName: shortNameSchema,
  })
  .strict()
  .refine((value) => Boolean(value.moduleKey) !== Boolean(value.courseCode));

const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const lazyRequireAuth = () =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return (requireAuth() as unknown as MiddlewareHandler<ShortNameEnv>)(
      c,
      next,
    );
  }) as MiddlewareHandler<ShortNameEnv>;

type ShortNameAppDependencies = { writeAuth?: MiddlewareHandler<ShortNameEnv> };

const toPublicEntry = (entry: {
  id: string;
  identityType: string;
  identityKey: string;
  language: string;
  shortName: string;
  locked?: boolean;
  updatedAt: Date;
}) => ({
  id: entry.id,
  identityType: entry.identityType.toLowerCase(),
  identityKey: entry.identityKey,
  language: entry.language.toLowerCase(),
  shortName: entry.shortName,
  ...(entry.locked === undefined ? {} : { locked: entry.locked }),
  updatedAt: entry.updatedAt.toISOString(),
});

const rejectBanned: MiddlewareHandler<ShortNameEnv> = async (c, next) => {
  if (c.get("user").banned) return c.json({ error: "banned" }, 403);
  await next();
};

export const createCourseShortNamesApp = ({
  writeAuth = lazyRequireAuth(),
}: ShortNameAppDependencies = {}) =>
  new Hono<ShortNameEnv>()
    .get("/", async (c) => {
      const entries = await prisma.courseShortName.findMany({
        where: {},
        orderBy: [
          { identityType: "asc" },
          { identityKey: "asc" },
          { language: "asc" },
        ],
        select: {
          id: true,
          identityType: true,
          identityKey: true,
          language: true,
          shortName: true,
          updatedAt: true,
        },
      });
      const lastUpdated = entries.reduce(
        (latest, entry) => Math.max(latest, entry.updatedAt.getTime()),
        0,
      );
      c.header(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      c.header(
        "ETag",
        `W/"course-short-names-${entries.length}-${lastUpdated}"`,
      );
      return c.json({ entries: entries.map(toPublicEntry) });
    })
    .put(
      "/",
      writeAuth,
      rejectBanned,
      zValidator("json", editInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const input = c.req.valid("json");
        const identityType = input.moduleKey ? "MODULE" : "COURSE_CODE";
        const identityKey = input.moduleKey ?? input.courseCode!;
        const language = input.language.toUpperCase() as "ZH" | "EN";
        const now = new Date();
        const since = new Date(now.getTime() - DAY_MS);

        const result = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.userId}))`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${identityType}:${identityKey}:${language}`}))`;
          const existing = await tx.courseShortName.findUnique({
            where: {
              identityType_identityKey_language: {
                identityType,
                identityKey,
                language,
              },
            },
          });
          if (existing?.locked) return { kind: "locked" as const };

          const recent = await tx.courseShortNameRevision.count({
            where: { editorId: user.userId, createdAt: { gte: since } },
          });
          if (recent >= COURSE_SHORT_NAME_DAILY_LIMIT)
            return { kind: "rate_limited" as const };

          const entry = existing
            ? await tx.courseShortName.update({
                where: { id: existing.id },
                data: { shortName: input.shortName, updatedById: user.userId },
              })
            : await tx.courseShortName.create({
                data: {
                  identityType,
                  identityKey,
                  language,
                  shortName: input.shortName,
                  updatedById: user.userId,
                },
              });
          await tx.courseShortNameRevision.create({
            data: {
              entryId: entry.id,
              editorId: user.userId,
              shortName: input.shortName,
              action: "EDIT",
            },
          });
          return { kind: "saved" as const, entry };
        });

        if (result.kind === "locked") return c.json({ error: "locked" }, 409);
        if (result.kind === "rate_limited")
          return c.json({ error: "rate_limited" }, 429);
        return c.json({ entry: toPublicEntry(result.entry) });
      },
    );

export default createCourseShortNamesApp();
