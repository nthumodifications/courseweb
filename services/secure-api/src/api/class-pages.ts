import { bodyLimit } from "hono/body-limit";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { z } from "zod";
import type {
  ClassPageReportReason,
  ClassPageReportTargetType,
  User,
} from "@prisma/client";
import prisma from "../client";
import { getFirebaseAdmin } from "../config/firebase_admin";
import { userRateLimit } from "../middleware/userRateLimit";
import {
  createUserStorageStore,
  resolveUserStorageMode,
} from "../storage/userStore";

type SecureEnv = { Variables: { user: User } };
type ClassPagesDb = typeof prisma;
type ClassPagesDependencies = {
  auth?: MiddlewareHandler<SecureEnv>;
  rateLimit?: MiddlewareHandler<SecureEnv>;
  db?: ClassPagesDb;
  getTimetable?: (userId: string, c: Context<SecureEnv>) => Promise<unknown>;
};

const semesterSchema = z.string().regex(/^\d{5}$/u);
const courseIdSchema = z.string().trim().min(1).max(80);
const semesterCourse = z.object({
  semester: semesterSchema,
  courseId: courseIdSchema,
});
const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
const isHandle = (value: string) => /^@[\p{L}\p{N}_.-]{1,40}$/u.test(value);
const contactSchema = z
  .object({
    label: z.string().trim().min(1).max(30),
    value: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => isHttpsUrl(value) || isHandle(value)),
  })
  .strict();
const profileInput = z
  .object({
    displayName: z.string().trim().min(1).max(50),
    department: z.string().trim().min(1).max(60),
    year: z.string().trim().min(1).max(20),
    contacts: z.array(contactSchema).max(4),
    displayNameVisible: z.boolean(),
    departmentVisible: z.boolean(),
    yearVisible: z.boolean(),
    contactsVisible: z.boolean(),
  })
  .strict();
const joinInput = semesterCourse.strict();
const joinAllInput = z.object({ semester: semesterSchema }).strict();
const linkInput = z
  .object({
    label: z.string().trim().min(1).max(60),
    url: z.string().trim().min(1).max(500).refine(isHttpsUrl),
  })
  .strict();
const membershipUpdateInput = z
  .object({ lookingForPartners: z.boolean() })
  .strict();
const membershipIdParam = z.object({ membershipId: z.string().uuid() });
const linkIdParam = z.object({ linkId: z.string().uuid() });
const blockIdParam = z.object({ blockId: z.string().uuid() });
const reportInput = semesterCourse
  .extend({
    targetType: z.enum(["member", "link"]),
    targetId: z.string().uuid(),
    reason: z.enum(["spam", "harassment", "personal_info", "other"]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
const blockInput = semesterCourse
  .extend({ membershipId: z.string().uuid() })
  .strict();

const invalidInput = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const lazyRequireAuth = (async (c, next) => {
  const { requireAuth } = await import("../middleware/requireAuth");
  return requireAuth()(c, next);
}) as MiddlewareHandler<SecureEnv>;

const ownsCourse = (timetable: unknown, semester: string, courseId: string) => {
  if (typeof timetable !== "object" || timetable === null) return false;
  const courses = (timetable as Record<string, unknown>)[semester];
  return Array.isArray(courses) && courses.some((id) => id === courseId);
};

const toProfile = (profile: any, blocks: any[] = []) =>
  profile
    ? {
        displayName: profile.displayName,
        department: profile.department,
        year: profile.year,
        contacts: Array.isArray(profile.contacts) ? profile.contacts : [],
        displayNameVisible: profile.displayNameVisible,
        departmentVisible: profile.departmentVisible,
        yearVisible: profile.yearVisible,
        contactsVisible: profile.contactsVisible,
        blocks: blocks.map((block: any) => ({ id: block.id })),
      }
    : null;

const publicMember = (membership: any) => {
  const profile = membership.user?.classProfile;
  if (!profile) return null;
  return {
    id: membership.id,
    displayName: profile.displayNameVisible ? profile.displayName : null,
    department: profile.departmentVisible ? profile.department : null,
    year: profile.yearVisible ? profile.year : null,
    contacts:
      profile.contactsVisible && Array.isArray(profile.contacts)
        ? profile.contacts
        : [],
    lookingForPartners: membership.lookingForPartners,
    selfDeclared: membership.selfDeclared,
  };
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

export const createClassPagesApp = ({
  auth = lazyRequireAuth,
  rateLimit = userRateLimit as MiddlewareHandler<SecureEnv>,
  db = prisma,
  getTimetable = async (userId, c) => {
    const store = createUserStorageStore({
      mode: resolveUserStorageMode(),
      getFirestore: () => getFirebaseAdmin(c).adminFirestore,
    });
    return (await store.get(userId, "courses"))?.value;
  },
}: ClassPagesDependencies = {}) => {
  const app = new Hono<SecureEnv>().use("*", bodyLimit({ maxSize: 16 * 1024 }));

  app.get("/profile", auth, async (c) => {
    const userId = c.get("user").userId;
    const [profile, blocks] = await Promise.all([
      db.classPageProfile.findUnique({ where: { userId } }),
      db.classPageBlock.findMany({
        where: { blockerId: userId },
        select: { id: true },
      }),
    ]);
    return c.json({ profile: toProfile(profile, blocks) });
  });

  app.put(
    "/profile",
    auth,
    rateLimit,
    zValidator("json", profileInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const input = c.req.valid("json");
      const profile = await db.classPageProfile.upsert({
        where: { userId },
        create: { userId, ...input, contacts: input.contacts },
        update: { ...input, contacts: input.contacts },
      });
      return c.json({ profile: toProfile(profile) });
    },
  );

  // Leaving is deliberately one transaction: the profile, all memberships,
  // and every authored link disappear together.
  app.delete("/profile", auth, rateLimit, async (c) => {
    const userId = c.get("user").userId;
    await db.$transaction(async (tx) => {
      await tx.classPageLink.deleteMany({ where: { authorId: userId } });
      await tx.classPageMembership.deleteMany({ where: { userId } });
      await tx.classPageProfile.deleteMany({ where: { userId } });
    });
    return c.json({ ok: true });
  });

  app.post(
    "/memberships",
    auth,
    rateLimit,
    zValidator("json", joinInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const { semester, courseId } = c.req.valid("json");
      if (!ownsCourse(await getTimetable(userId, c), semester, courseId)) {
        return c.json({ error: "course_not_in_timetable" }, 403);
      }
      const profile = await db.classPageProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) {
        return c.json({ error: "profile_required" }, 409);
      }
      const membership = await db.classPageMembership.upsert({
        where: { userId_semester_courseId: { userId, semester, courseId } },
        create: {
          userId,
          profileId: profile.id,
          semester,
          courseId,
          selfDeclared: true,
        },
        update: {},
        select: { id: true, lookingForPartners: true, selfDeclared: true },
      });
      return c.json({ membership }, 201);
    },
  );

  app.post(
    "/memberships/join-all",
    auth,
    rateLimit,
    zValidator("json", joinAllInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const { semester } = c.req.valid("json");
      const timetable = await getTimetable(userId, c);
      const ids =
        typeof timetable === "object" && timetable !== null
          ? (timetable as Record<string, unknown>)[semester]
          : undefined;
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.some((id) => typeof id !== "string") ||
        ids.length > 100
      ) {
        return c.json({ error: "no_courses" }, 400);
      }
      const profile = await db.classPageProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile) {
        return c.json({ error: "profile_required" }, 409);
      }
      await db.$transaction(
        ids.map((courseId) =>
          db.classPageMembership.upsert({
            where: {
              userId_semester_courseId: {
                userId,
                semester,
                courseId: courseId as string,
              },
            },
            create: {
              userId,
              profileId: profile.id,
              semester,
              courseId: courseId as string,
              selfDeclared: true,
            },
            update: {},
          }),
        ),
      );
      return c.json({ joined: ids.length });
    },
  );

  app.patch(
    "/memberships/:membershipId",
    auth,
    rateLimit,
    zValidator("param", membershipIdParam, invalidInput),
    zValidator("json", membershipUpdateInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const { membershipId } = c.req.param();
      const membership = await db.classPageMembership.findFirst({
        where: { id: membershipId, userId },
      });
      if (!membership) return c.json({ error: "not_found" }, 404);
      if (
        !ownsCourse(
          await getTimetable(userId, c),
          membership.semester,
          membership.courseId,
        )
      ) {
        return c.json({ error: "course_not_in_timetable" }, 403);
      }
      const updated = await db.classPageMembership.update({
        where: { id: membershipId },
        data: c.req.valid("json"),
        select: { id: true, lookingForPartners: true, selfDeclared: true },
      });
      return c.json({ membership: updated });
    },
  );

  app.delete(
    "/memberships/:membershipId",
    auth,
    rateLimit,
    zValidator("param", membershipIdParam, invalidInput),
    async (c) => {
      const result = await db.classPageMembership.deleteMany({
        where: {
          id: c.req.param("membershipId"),
          userId: c.get("user").userId,
        },
      });
      if (result.count === 0) return c.json({ error: "not_found" }, 404);
      return c.json({ ok: true });
    },
  );

  app.get(
    "/membership/:semester/:courseId",
    auth,
    zValidator("param", semesterCourse, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const { semester, courseId } = c.req.valid("param");
      if (!ownsCourse(await getTimetable(userId, c), semester, courseId)) {
        return c.json({ eligible: false, membership: null });
      }
      const membership = await db.classPageMembership.findUnique({
        where: { userId_semester_courseId: { userId, semester, courseId } },
        select: { id: true, lookingForPartners: true, selfDeclared: true },
      });
      return c.json({ eligible: true, membership });
    },
  );

  const requireClassAccess = async (
    c: Context<SecureEnv>,
    semester: string,
    courseId: string,
  ) => {
    const userId = c.get("user").userId;
    if (!ownsCourse(await getTimetable(userId, c), semester, courseId))
      return null;
    const membership = await db.classPageMembership.findUnique({
      where: { userId_semester_courseId: { userId, semester, courseId } },
    });
    return membership ? { userId, membership } : null;
  };

  app.get(
    "/class/:semester/:courseId",
    auth,
    zValidator("param", semesterCourse, invalidInput),
    async (c) => {
      const { semester, courseId } = c.req.valid("param");
      const access = await requireClassAccess(c, semester, courseId);
      if (!access) return c.json({ error: "not_available" }, 404);

      const blocks = await db.classPageBlock.findMany({
        where: {
          OR: [{ blockerId: access.userId }, { blockedId: access.userId }],
        },
        select: { blockerId: true, blockedId: true },
      });
      const blockedUserIds = new Set(
        blocks.map((block: any) =>
          block.blockerId === access.userId ? block.blockedId : block.blockerId,
        ),
      );
      const memberships = await db.classPageMembership.findMany({
        where: { semester, courseId },
        include: {
          user: { select: { userId: true, banned: true, classProfile: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      const visible = memberships.filter(
        (membership: any) =>
          !membership.user.banned &&
          membership.user.classProfile &&
          (membership.user.userId === access.userId ||
            !blockedUserIds.has(membership.user.userId)),
      );
      const members = visible.map(publicMember).filter(Boolean);
      const visibleMembershipIds = new Set(
        visible.map((membership: any) => membership.id),
      );
      const links = await db.classPageLink.findMany({
        where: { status: "VISIBLE", membership: { semester, courseId } },
        include: { membership: { select: { id: true, userId: true } } },
        orderBy: { createdAt: "desc" },
      });
      return c.json({
        members,
        links: links
          .filter((link: any) => visibleMembershipIds.has(link.membershipId))
          .map((link: any) => ({
            id: link.id,
            label: link.label,
            url: link.url,
            createdAt: link.createdAt.toISOString(),
            mine: link.authorId === access.userId,
            authorMembershipId: link.membership.id,
          })),
      });
    },
  );

  app.post(
    "/class/:semester/:courseId/links",
    auth,
    rateLimit,
    zValidator("param", semesterCourse, invalidInput),
    zValidator("json", linkInput, invalidInput),
    async (c) => {
      const { semester, courseId } = c.req.valid("param");
      const access = await requireClassAccess(c, semester, courseId);
      if (!access) return c.json({ error: "not_available" }, 404);
      const link = await db.classPageLink.create({
        data: {
          ...c.req.valid("json"),
          authorId: access.userId,
          membershipId: access.membership.id,
        },
        select: { id: true, label: true, url: true, createdAt: true },
      });
      return c.json(
        {
          link: {
            ...link,
            createdAt: link.createdAt.toISOString(),
            mine: true,
          },
        },
        201,
      );
    },
  );

  app.delete(
    "/links/:linkId",
    auth,
    rateLimit,
    zValidator("param", linkIdParam, invalidInput),
    async (c) => {
      const result = await db.classPageLink.deleteMany({
        where: { id: c.req.param("linkId"), authorId: c.get("user").userId },
      });
      if (result.count === 0) return c.json({ error: "not_found" }, 404);
      return c.json({ ok: true });
    },
  );

  app.post(
    "/reports",
    auth,
    rateLimit,
    zValidator("json", reportInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const input = c.req.valid("json");
      const access = await requireClassAccess(
        c,
        input.semester,
        input.courseId,
      );
      if (!access) return c.json({ error: "not_available" }, 404);
      let membershipId: string | null = null;
      let linkId: string | null = null;
      let targetUserId: string | null = null;
      if (input.targetType === "member") {
        const target = await db.classPageMembership.findFirst({
          where: {
            id: input.targetId,
            semester: input.semester,
            courseId: input.courseId,
          },
          select: { id: true, userId: true },
        });
        if (!target || target.userId === userId)
          return c.json({ error: "not_found" }, 404);
        membershipId = target.id;
        targetUserId = target.userId;
      } else {
        const target = await db.classPageLink.findFirst({
          where: {
            id: input.targetId,
            status: "VISIBLE",
            membership: { semester: input.semester, courseId: input.courseId },
          },
          select: { id: true, authorId: true },
        });
        if (!target) return c.json({ error: "not_found" }, 404);
        linkId = target.id;
        targetUserId = target.authorId;
      }
      try {
        await db.classPageReport.create({
          data: {
            reporterId: userId,
            targetType:
              input.targetType.toUpperCase() as ClassPageReportTargetType,
            membershipId,
            linkId,
            targetUserId,
            targetSemester: input.semester,
            targetCourseId: input.courseId,
            reason: input.reason.toUpperCase() as ClassPageReportReason,
            note: input.note,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error))
          return c.json({ error: "already_reported" }, 409);
        throw error;
      }
      return c.json({ ok: true }, 201);
    },
  );

  app.post(
    "/blocks",
    auth,
    rateLimit,
    zValidator("json", blockInput, invalidInput),
    async (c) => {
      const userId = c.get("user").userId;
      const input = c.req.valid("json");
      const access = await requireClassAccess(
        c,
        input.semester,
        input.courseId,
      );
      if (!access) return c.json({ error: "not_available" }, 404);
      const target = await db.classPageMembership.findFirst({
        where: {
          id: input.membershipId,
          semester: input.semester,
          courseId: input.courseId,
        },
        select: { userId: true },
      });
      if (!target || target.userId === userId)
        return c.json({ error: "not_found" }, 404);
      const block = await db.classPageBlock.upsert({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: target.userId },
        },
        create: { blockerId: userId, blockedId: target.userId },
        update: {},
        select: { id: true },
      });
      return c.json({ block }, 201);
    },
  );

  app.delete(
    "/blocks/:blockId",
    auth,
    rateLimit,
    zValidator("param", blockIdParam, invalidInput),
    async (c) => {
      const result = await db.classPageBlock.deleteMany({
        where: { id: c.req.param("blockId"), blockerId: c.get("user").userId },
      });
      if (result.count === 0) return c.json({ error: "not_found" }, 404);
      return c.json({ ok: true });
    },
  );

  return app;
};

export default createClassPagesApp();
