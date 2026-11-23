import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";
import type { Prisma, User } from "@prisma/client";
import { z } from "zod";
import prisma from "../client";

const DAY_MS = 24 * 60 * 60 * 1000;
export const PLANNER_TEMPLATE_DAILY_LIMIT = 5;
export const PLANNER_TEMPLATE_USER_LIMIT = 20;
const MAX_PAYLOAD_BYTES = 512_000;

type TemplateEnv = { Variables: { user: User } };

type FolderPayload = {
  key: string;
  title: string;
  parentKey: string | null;
  min: number;
  max: number;
  metric: "credits" | "courses";
  requireChildValidation: boolean;
  titlePlacement: string;
  order: number;
  color: string | null;
};
type ItemPayload = {
  key: string;
  courseId: string;
  title: string;
  credits: number;
  folderKey: string | null;
  term: string | null;
  description: string | null;
  dependson: string[];
};
export type PlannerTemplatePayload = {
  version: 1;
  folders: FolderPayload[];
  items: ItemPayload[];
};

export const sanitizePlannerTemplateText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/[<>]/gu, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

const cleanString = (max: number, min = 0) =>
  z
    .string()
    .transform(sanitizePlannerTemplateText)
    .refine((value) => value.length >= min && [...value].length <= max);

const keySchema = cleanString(40, 1);
const folderSchema = z
  .object({
    key: keySchema,
    title: cleanString(60, 1),
    parentKey: keySchema.nullable(),
    min: z.number().finite().min(0).max(500),
    max: z.number().finite().min(0).max(500),
    metric: z.enum(["credits", "courses"]),
    requireChildValidation: z.boolean(),
    titlePlacement: cleanString(40, 1),
    order: z.number().int().min(-10000).max(10000),
    color: cleanString(40).nullable(),
  })
  .strict();
const itemSchema = z
  .object({
    key: keySchema,
    courseId: cleanString(40),
    title: cleanString(100, 1),
    credits: z.number().finite().min(0).max(20),
    folderKey: keySchema.nullable(),
    term: z
      .string()
      .regex(/^[1-7]-[12]$/u)
      .nullable(),
    description: cleanString(500).nullable(),
    dependson: z.array(keySchema).max(400),
  })
  .strict();
const payloadSchema = z
  .object({
    version: z.literal(1),
    folders: z.array(folderSchema).max(80),
    items: z.array(itemSchema).max(400),
  })
  .strict()
  .superRefine((payload, ctx) => {
    const folderKeys = new Set(payload.folders.map((folder) => folder.key));
    const itemKeys = new Set(payload.items.map((item) => item.key));
    if (folderKeys.size !== payload.folders.length) {
      ctx.addIssue({
        code: "custom",
        path: ["folders"],
        message: "duplicate_key",
      });
    }
    if (itemKeys.size !== payload.items.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "duplicate_key",
      });
    }

    const parents = new Map(
      payload.folders.map((folder) => [folder.key, folder.parentKey]),
    );
    for (const [index, folder] of payload.folders.entries()) {
      if (folder.parentKey && !folderKeys.has(folder.parentKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["folders", index, "parentKey"],
          message: "unknown_parent",
        });
      }
      const visited = new Set<string>();
      let current: string | null | undefined = folder.key;
      while (current) {
        if (visited.has(current)) {
          ctx.addIssue({
            code: "custom",
            path: ["folders", index, "parentKey"],
            message: "folder_cycle",
          });
          break;
        }
        visited.add(current);
        current = parents.get(current);
      }
    }

    const dependencies = new Map(
      payload.items.map((item) => [item.key, item.dependson]),
    );
    for (const [index, item] of payload.items.entries()) {
      if (item.folderKey && !folderKeys.has(item.folderKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "folderKey"],
          message: "unknown_folder",
        });
      }
      for (const dependency of item.dependson) {
        if (!itemKeys.has(dependency)) {
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "dependson"],
            message: "unknown_dependency",
          });
        }
      }
      const visited = new Set<string>();
      const visiting = new Set<string>();
      const hasCycle = (key: string): boolean => {
        if (visiting.has(key)) return true;
        if (visited.has(key)) return false;
        visiting.add(key);
        for (const dependency of dependencies.get(key) ?? []) {
          if (dependencies.has(dependency) && hasCycle(dependency)) return true;
        }
        visiting.delete(key);
        visited.add(key);
        return false;
      };
      if (hasCycle(item.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "dependson"],
          message: "item_cycle",
        });
      }
    }

    if (
      new TextEncoder().encode(JSON.stringify(payload)).length >
      MAX_PAYLOAD_BYTES
    ) {
      ctx.addIssue({ code: "custom", path: [], message: "payload_too_large" });
    }
  });

const templateFields = {
  title: cleanString(100, 1),
  description: cleanString(1000).default(""),
  department: cleanString(100, 1),
  entranceYear: z
    .string()
    .trim()
    .regex(/^\d{2,3}$/u),
  requiredCredits: z.number().int().min(0).max(300),
  payload: payloadSchema,
};
const createInput = z.object(templateFields).strict();
const patchInput = z
  .object(templateFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const listQuery = z.object({
  department: z.string().optional(),
  entranceYear: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  mine: z.enum(["true", "false", "1", "0"]).optional(),
});
const reportInput = z
  .object({
    reason: z.enum(["WRONG_INFO", "SPAM", "OFFENSIVE", "OTHER"]),
    note: cleanString(500).optional(),
  })
  .strict();
const invalidInput = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const lazyRequireAuth = () =>
  (async (c, next) => {
    const { requireAuth } = await import("../middleware/requireAuth");
    return requireAuth([], { allowBanned: true })(c, next);
  }) as MiddlewareHandler<TemplateEnv>;
const lazyOptionalAuth = async (c: Context) => {
  const { getOptionalAuthUser } = await import("../middleware/requireAuth");
  return getOptionalAuthUser(c);
};
const rejectBanned: MiddlewareHandler<TemplateEnv> = async (c, next) => {
  if (c.get("user").banned) return c.json({ error: "banned" }, 403);
  await next();
};

type AppDependencies = {
  auth?: MiddlewareHandler<TemplateEnv>;
  optionalAuth?: (c: Context) => Promise<User | undefined>;
};

type TemplateRow = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  department: string;
  entranceYear: string;
  requiredCredits: number;
  folderCount: number;
  courseCount: number;
  official: boolean;
  status: string;
  useCount: number;
  updatedAt: Date;
  createdAt?: Date;
  payload?: unknown;
};

export const toTemplateSummary = (template: TemplateRow, userId?: string) => ({
  id: template.id,
  title: template.title,
  description: template.description,
  department: template.department,
  entranceYear: template.entranceYear,
  requiredCredits: template.requiredCredits,
  folderCount: template.folderCount,
  courseCount: template.courseCount,
  official: template.official,
  useCount: template.useCount,
  updatedAt: template.updatedAt.toISOString(),
  mine: userId === template.authorId,
});

export const createPlannerTemplatesApp = ({
  auth = lazyRequireAuth(),
  optionalAuth = lazyOptionalAuth,
}: AppDependencies = {}) =>
  new Hono<TemplateEnv>()
    .get("/", zValidator("query", listQuery, invalidInput), async (c) => {
      const query = c.req.valid("query");
      const user =
        query.mine && query.mine !== "false" && query.mine !== "0"
          ? await optionalAuth(c)
          : undefined;
      const mineRequested = Boolean(
        user && query.mine && query.mine !== "false" && query.mine !== "0",
      );
      const search = query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" as const } },
              {
                department: { contains: query.q, mode: "insensitive" as const },
              },
              {
                description: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {};
      const where: Prisma.PlannerTemplateWhereInput = {
        ...(query.department ? { department: query.department } : {}),
        ...(query.entranceYear ? { entranceYear: query.entranceYear } : {}),
        AND: [
          search,
          mineRequested ? { authorId: user!.userId } : { status: "VISIBLE" },
        ],
      };
      const templates = await prisma.plannerTemplate.findMany({
        where,
        orderBy: [
          { official: "desc" },
          { useCount: "desc" },
          { updatedAt: "desc" },
        ],
        take: 100,
      });
      return c.json({
        templates: templates.map((template) => ({
          ...toTemplateSummary(template, user?.userId),
          ...(template.authorId === user?.userId
            ? { status: template.status.toLowerCase() }
            : {}),
        })),
      });
    })
    .get("/departments", async (c) => {
      const groups = await prisma.plannerTemplate.groupBy({
        by: ["department", "entranceYear"],
        where: { status: "VISIBLE" },
        _count: { _all: true },
        orderBy: [{ department: "asc" }, { entranceYear: "desc" }],
      });
      return c.json({
        departments: groups.map((group) => ({
          department: group.department,
          entranceYear: group.entranceYear,
          count: group._count._all,
        })),
      });
    })
    .get("/:id", async (c) => {
      const id = c.req.param("id") ?? "";
      const template = await prisma.plannerTemplate.findUnique({
        where: { id },
      });
      if (!template) return c.json({ error: "not_found" }, 404);
      const user = await optionalAuth(c);
      if (template.status !== "VISIBLE" && user?.userId !== template.authorId) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json({
        template: {
          ...toTemplateSummary(template, user?.userId),
          payload: template.payload,
        },
      });
    })
    .post(
      "/",
      auth,
      rejectBanned,
      zValidator("json", createInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const input = c.req.valid("json");
        const now = new Date();
        const result = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.userId}))`;
          const [total, recent] = await Promise.all([
            tx.plannerTemplate.count({ where: { authorId: user.userId } }),
            tx.plannerTemplate.count({
              where: {
                authorId: user.userId,
                createdAt: { gte: new Date(now.getTime() - DAY_MS) },
              },
            }),
          ]);
          if (total >= PLANNER_TEMPLATE_USER_LIMIT)
            return { kind: "limit" as const };
          if (recent >= PLANNER_TEMPLATE_DAILY_LIMIT)
            return { kind: "rate_limited" as const };
          const template = await tx.plannerTemplate.create({
            data: {
              authorId: user.userId,
              title: input.title,
              description: input.description,
              department: input.department,
              entranceYear: input.entranceYear,
              requiredCredits: input.requiredCredits,
              payload: input.payload,
              folderCount: input.payload.folders.length,
              courseCount: input.payload.items.length,
            },
          });
          return { kind: "created" as const, template };
        });
        if (result.kind === "limit")
          return c.json({ error: "template_limit" }, 409);
        if (result.kind === "rate_limited")
          return c.json({ error: "rate_limited" }, 429);
        return c.json(
          { template: toTemplateSummary(result.template, user.userId) },
          201,
        );
      },
    )
    .patch(
      "/:id",
      auth,
      rejectBanned,
      zValidator("json", patchInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const id = c.req.param("id") ?? "";
        const input = c.req.valid("json");
        // An official badge vouches for specific content; editing it again
        // sends the template back to community status until an admin re-checks.
        const data = {
          ...input,
          ...(input.payload ||
          input.title ||
          input.requiredCredits !== undefined
            ? { official: false }
            : {}),
          ...(input.payload
            ? {
                folderCount: input.payload.folders.length,
                courseCount: input.payload.items.length,
              }
            : {}),
        };
        const updated = await prisma.plannerTemplate.updateMany({
          where: { id, authorId: user.userId },
          data,
        });
        if (updated.count === 0) return c.json({ error: "not_found" }, 404);
        const template = await prisma.plannerTemplate.findUnique({
          where: { id },
        });
        return c.json({ template: toTemplateSummary(template!, user.userId) });
      },
    )
    .delete("/:id", auth, rejectBanned, async (c) => {
      const result = await prisma.plannerTemplate.deleteMany({
        where: { id: c.req.param("id") ?? "", authorId: c.get("user").userId },
      });
      if (result.count === 0) return c.json({ error: "not_found" }, 404);
      return c.body(null, 204);
    })
    .post("/:id/use", async (c) => {
      const id = c.req.param("id") ?? "";
      const template = await prisma.plannerTemplate.findFirst({
        where: { id, status: "VISIBLE" },
        select: { id: true },
      });
      if (!template) return c.json({ error: "not_found" }, 404);
      // Only signed-in users count, once each per template.
      const user = await optionalAuth(c);
      if (!user || user.banned) return c.body(null, 204);
      await prisma.$transaction(async (tx) => {
        const inserted = await tx.plannerTemplateUse.createMany({
          data: [{ templateId: id, userId: user.userId }],
          skipDuplicates: true,
        });
        if (inserted.count > 0) {
          await tx.plannerTemplate.update({
            where: { id },
            data: { useCount: { increment: 1 } },
          });
        }
      });
      return c.body(null, 204);
    })
    .post(
      "/:id/report",
      auth,
      rejectBanned,
      zValidator("json", reportInput, invalidInput),
      async (c) => {
        const user = c.get("user");
        const id = c.req.param("id") ?? "";
        const template = await prisma.plannerTemplate.findFirst({
          where: { id, status: "VISIBLE" },
          select: { id: true },
        });
        if (!template) return c.json({ error: "not_found" }, 404);
        const input = c.req.valid("json");
        await prisma.plannerTemplateReport.upsert({
          where: {
            templateId_reporterId: { templateId: id, reporterId: user.userId },
          },
          create: {
            templateId: id,
            reporterId: user.userId,
            reason: input.reason,
            note: input.note || null,
          },
          update: {
            reason: input.reason,
            note: input.note || null,
            createdAt: new Date(),
            resolvedAt: null,
            resolvedById: null,
          },
        });
        return c.json({ ok: true });
      },
    );

export default createPlannerTemplatesApp();
