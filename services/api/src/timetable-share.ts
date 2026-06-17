import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "./utils/auth";
import { HTTPException } from "hono/http-exception";
import prismaClients from "./prisma/client";
import type { Bindings } from "./index";

function generateShareId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

const CourseNotesSchema = z.record(z.string());
const GradeContextSchema = z.record(
  z.object({
    grade: z.string().optional(),
    difficulty: z.number().min(1).max(5).optional(),
    attendance: z.string().optional(),
  }),
);

const CreateShareSchema = z.object({
  displayName: z.string().max(100).optional(),
  semesters: z.array(z.string().length(5)).min(1),
  courses: z.record(z.array(z.string())),
  courseNotes: CourseNotesSchema.optional().default({}),
  visibility: z.enum(["link_only", "public"]).default("link_only"),
  isLive: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  gradeContext: GradeContextSchema.optional(),
});

const UpdateShareSchema = z.object({
  displayName: z.string().max(100).optional(),
  courses: z.record(z.array(z.string())).optional(),
  courseNotes: CourseNotesSchema.optional(),
  visibility: z.enum(["link_only", "public"]).optional(),
  isLive: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  gradeContext: GradeContextSchema.optional(),
});

const app = new Hono<{ Bindings: Bindings }>()

  // ── Public: get a shared timetable ──────────────────────────────────────────
  .get("/view/:id", async (c) => {
    const { id } = c.req.param();
    const prisma = await prismaClients.fetch(c.env.DB);
    const share = await prisma.sharedTimetable.findFirst({
      where: { id, deletedAt: null },
    });
    if (!share) throw new HTTPException(404, { message: "Not found" });
    return c.json({
      ...share,
      semesters: JSON.parse(share.semesters),
      courses: JSON.parse(share.courses),
      courseNotes: JSON.parse(share.courseNotes),
      gradeContext: share.gradeContext ? JSON.parse(share.gradeContext) : null,
    });
  })

  // ── Public: community gallery ────────────────────────────────────────────────
  .get(
    "/public",
    zValidator(
      "query",
      z.object({
        semester: z.string().optional(),
        limit: z.coerce.number().max(50).default(24),
        offset: z.coerce.number().default(0),
      }),
    ),
    async (c) => {
      const { semester, limit, offset } = c.req.valid("query");
      const prisma = await prismaClients.fetch(c.env.DB);

      const all = await prisma.sharedTimetable.findMany({
        where: { visibility: "public", deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: limit + 1,
        skip: offset,
      });

      const filtered = semester
        ? all.filter((s) => {
            const sems: string[] = JSON.parse(s.semesters);
            return sems.includes(semester);
          })
        : all;

      const hasMore = filtered.length > limit;
      const items = filtered.slice(0, limit).map((s) => ({
        ...s,
        semesters: JSON.parse(s.semesters),
        courses: JSON.parse(s.courses),
        courseNotes: JSON.parse(s.courseNotes),
        gradeContext: s.gradeContext ? JSON.parse(s.gradeContext) : null,
      }));

      return c.json({ items, hasMore });
    },
  )

  // ── Public: get group by invite code ─────────────────────────────────────────
  .get("/group/:code", async (c) => {
    const { code } = c.req.param();
    const prisma = await prismaClients.fetch(c.env.DB);
    const group = await prisma.timetableGroup.findUnique({
      where: { inviteCode: code },
    });
    if (!group) throw new HTTPException(404, { message: "Group not found" });

    const members: Array<{
      userId: string;
      sharedTimetableId: string;
      label: string;
      joinedAt: string;
    }> = JSON.parse(group.members);

    // Resolve each member's share
    const shares = await Promise.all(
      members.map((m) =>
        prisma.sharedTimetable
          .findFirst({ where: { id: m.sharedTimetableId, deletedAt: null } })
          .then((s) =>
            s
              ? {
                  ...s,
                  semesters: JSON.parse(s.semesters),
                  courses: JSON.parse(s.courses),
                  courseNotes: JSON.parse(s.courseNotes),
                  gradeContext: s.gradeContext
                    ? JSON.parse(s.gradeContext)
                    : null,
                }
              : null,
          ),
      ),
    );

    return c.json({
      ...group,
      members: members.map((m, i) => ({ ...m, share: shares[i] })),
    });
  })

  // ── Auth: list own shares ────────────────────────────────────────────────────
  .get("/", auth(["calendar"]), async (c) => {
    const userId = c.get("user").sub!;
    const prisma = await prismaClients.fetch(c.env.DB);
    const shares = await prisma.sharedTimetable.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    return c.json(
      shares.map((s) => ({
        ...s,
        semesters: JSON.parse(s.semesters),
        courses: JSON.parse(s.courses),
        courseNotes: JSON.parse(s.courseNotes),
        gradeContext: s.gradeContext ? JSON.parse(s.gradeContext) : null,
      })),
    );
  })

  // ── Auth: create share ───────────────────────────────────────────────────────
  .post(
    "/",
    auth(["calendar"]),
    zValidator("json", CreateShareSchema),
    async (c) => {
      const userId = c.get("user").sub!;
      const body = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      // Limit: 20 active shares per user
      const existing = await prisma.sharedTimetable.count({
        where: { ownerId: userId, deletedAt: null },
      });
      if (existing >= 20) {
        throw new HTTPException(400, {
          message: "Share limit reached (max 20)",
        });
      }

      const id = generateShareId();
      const share = await prisma.sharedTimetable.create({
        data: {
          id,
          ownerId: userId,
          displayName: body.displayName,
          semesters: JSON.stringify(body.semesters),
          courses: JSON.stringify(body.courses),
          courseNotes: JSON.stringify(body.courseNotes ?? {}),
          visibility: body.visibility,
          isLive: body.isLive,
          isAnonymous: body.isAnonymous,
          gradeContext: body.gradeContext
            ? JSON.stringify(body.gradeContext)
            : null,
        },
      });

      return c.json(
        {
          ...share,
          semesters: JSON.parse(share.semesters),
          courses: JSON.parse(share.courses),
          courseNotes: JSON.parse(share.courseNotes),
          gradeContext: share.gradeContext
            ? JSON.parse(share.gradeContext)
            : null,
          shareUrl: `https://nthumods.com/zh/timetable/share/${share.id}`,
        },
        201,
      );
    },
  )

  // ── Auth: update share ───────────────────────────────────────────────────────
  .put(
    "/:id",
    auth(["calendar"]),
    zValidator("json", UpdateShareSchema),
    async (c) => {
      const userId = c.get("user").sub!;
      const { id } = c.req.param();
      const body = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      const existing = await prisma.sharedTimetable.findFirst({
        where: { id, ownerId: userId, deletedAt: null },
      });
      if (!existing) throw new HTTPException(404, { message: "Not found" });

      const updated = await prisma.sharedTimetable.update({
        where: { id },
        data: {
          ...(body.displayName !== undefined && {
            displayName: body.displayName,
          }),
          ...(body.courses !== undefined && {
            courses: JSON.stringify(body.courses),
          }),
          ...(body.courseNotes !== undefined && {
            courseNotes: JSON.stringify(body.courseNotes),
          }),
          ...(body.visibility !== undefined && { visibility: body.visibility }),
          ...(body.isLive !== undefined && { isLive: body.isLive }),
          ...(body.isAnonymous !== undefined && {
            isAnonymous: body.isAnonymous,
          }),
          ...(body.gradeContext !== undefined && {
            gradeContext: JSON.stringify(body.gradeContext),
          }),
        },
      });

      return c.json({
        ...updated,
        semesters: JSON.parse(updated.semesters),
        courses: JSON.parse(updated.courses),
        courseNotes: JSON.parse(updated.courseNotes),
        gradeContext: updated.gradeContext
          ? JSON.parse(updated.gradeContext)
          : null,
      });
    },
  )

  // ── Auth: delete share ───────────────────────────────────────────────────────
  .delete("/:id", auth(["calendar"]), async (c) => {
    const userId = c.get("user").sub!;
    const { id } = c.req.param();
    const prisma = await prismaClients.fetch(c.env.DB);

    const existing = await prisma.sharedTimetable.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });
    if (!existing) throw new HTTPException(404, { message: "Not found" });

    await prisma.sharedTimetable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return c.json({ ok: true });
  })

  // ── Auth: list saved timetables ──────────────────────────────────────────────
  .get("/saved", auth(["calendar"]), async (c) => {
    const userId = c.get("user").sub!;
    const prisma = await prismaClients.fetch(c.env.DB);

    const saved = await prisma.savedTimetable.findMany({
      where: { viewerId: userId },
      orderBy: { addedAt: "desc" },
    });

    const withShares = await Promise.all(
      saved.map(async (s) => {
        const share = await prisma.sharedTimetable.findFirst({
          where: { id: s.sharedTimetableId, deletedAt: null },
        });
        return {
          ...s,
          savedCourses: s.savedCourses ? JSON.parse(s.savedCourses) : null,
          share: share
            ? {
                ...share,
                semesters: JSON.parse(share.semesters),
                courses: JSON.parse(share.courses),
                courseNotes: JSON.parse(share.courseNotes),
                gradeContext: share.gradeContext
                  ? JSON.parse(share.gradeContext)
                  : null,
              }
            : null,
        };
      }),
    );

    return c.json(withShares);
  })

  // ── Auth: save a timetable ────────────────────────────────────────────────────
  .post(
    "/saved",
    auth(["calendar"]),
    zValidator(
      "json",
      z.object({
        sharedTimetableId: z.string().length(8),
        label: z.string().max(80).optional(),
        syncMode: z.enum(["live", "snapshot"]).default("live"),
      }),
    ),
    async (c) => {
      const userId = c.get("user").sub!;
      const { sharedTimetableId, label, syncMode } = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      const share = await prisma.sharedTimetable.findFirst({
        where: { id: sharedTimetableId, deletedAt: null },
      });
      if (!share) throw new HTTPException(404, { message: "Share not found" });
      if (share.ownerId === userId) {
        throw new HTTPException(400, { message: "Cannot save your own share" });
      }

      const id = crypto.randomUUID();
      const savedCourses = syncMode === "snapshot" ? share.courses : null;

      const saved = await prisma.savedTimetable.upsert({
        where: {
          viewerId_sharedTimetableId: { viewerId: userId, sharedTimetableId },
        },
        create: {
          id,
          viewerId: userId,
          sharedTimetableId,
          label: label ?? share.displayName ?? "Shared Timetable",
          syncMode,
          savedCourses,
        },
        update: {
          label: label ?? share.displayName ?? "Shared Timetable",
          syncMode,
          savedCourses: syncMode === "snapshot" ? share.courses : null,
        },
      });

      return c.json(saved, 201);
    },
  )

  // ── Auth: update last seen + label ─────────────────────────────────────────
  .patch(
    "/saved/:id",
    auth(["calendar"]),
    zValidator(
      "json",
      z.object({
        label: z.string().max(80).optional(),
        markSeen: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const userId = c.get("user").sub!;
      const { id } = c.req.param();
      const { label, markSeen } = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      const existing = await prisma.savedTimetable.findFirst({
        where: { id, viewerId: userId },
      });
      if (!existing) throw new HTTPException(404, { message: "Not found" });

      const updated = await prisma.savedTimetable.update({
        where: { id },
        data: {
          ...(label !== undefined && { label }),
          ...(markSeen && { lastSeenAt: new Date() }),
        },
      });
      return c.json(updated);
    },
  )

  // ── Auth: unsave ──────────────────────────────────────────────────────────────
  .delete("/saved/:id", auth(["calendar"]), async (c) => {
    const userId = c.get("user").sub!;
    const { id } = c.req.param();
    const prisma = await prismaClients.fetch(c.env.DB);

    const existing = await prisma.savedTimetable.findFirst({
      where: { id, viewerId: userId },
    });
    if (!existing) throw new HTTPException(404, { message: "Not found" });

    await prisma.savedTimetable.delete({ where: { id } });
    return c.json({ ok: true });
  })

  // ── Auth: create group ────────────────────────────────────────────────────────
  .post(
    "/group",
    auth(["calendar"]),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(80),
        semester: z.string().length(5),
        sharedTimetableId: z.string().length(8).optional(),
      }),
    ),
    async (c) => {
      const userId = c.get("user").sub!;
      const { name, semester, sharedTimetableId } = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      // Verify share belongs to user if provided
      if (sharedTimetableId) {
        const share = await prisma.sharedTimetable.findFirst({
          where: { id: sharedTimetableId, ownerId: userId, deletedAt: null },
        });
        if (!share)
          throw new HTTPException(404, { message: "Share not found" });
      }

      const id = crypto.randomUUID();
      const inviteCode = generateInviteCode();
      const initialMembers = sharedTimetableId
        ? JSON.stringify([
            {
              userId,
              sharedTimetableId,
              label: "Creator",
              joinedAt: new Date().toISOString(),
            },
          ])
        : JSON.stringify([]);

      const group = await prisma.timetableGroup.create({
        data: {
          id,
          name,
          inviteCode,
          semester,
          createdBy: userId,
          members: initialMembers,
        },
      });

      return c.json(
        { ...group, members: JSON.parse(group.members), inviteCode },
        201,
      );
    },
  )

  // ── Auth: join group ──────────────────────────────────────────────────────────
  .post(
    "/group/:code/join",
    auth(["calendar"]),
    zValidator(
      "json",
      z.object({
        sharedTimetableId: z.string().length(8),
        label: z.string().max(80).optional(),
      }),
    ),
    async (c) => {
      const userId = c.get("user").sub!;
      const { code } = c.req.param();
      const { sharedTimetableId, label } = c.req.valid("json");
      const prisma = await prismaClients.fetch(c.env.DB);

      const group = await prisma.timetableGroup.findUnique({
        where: { inviteCode: code },
      });
      if (!group) throw new HTTPException(404, { message: "Group not found" });

      const share = await prisma.sharedTimetable.findFirst({
        where: { id: sharedTimetableId, ownerId: userId, deletedAt: null },
      });
      if (!share) throw new HTTPException(404, { message: "Share not found" });

      const members: Array<{
        userId: string;
        sharedTimetableId: string;
        label: string;
        joinedAt: string;
      }> = JSON.parse(group.members);

      if (members.some((m) => m.userId === userId)) {
        // Update existing member's share
        const idx = members.findIndex((m) => m.userId === userId);
        members[idx] = {
          ...members[idx],
          sharedTimetableId,
          label: label ?? members[idx].label,
        };
      } else {
        members.push({
          userId,
          sharedTimetableId,
          label: label ?? "Member",
          joinedAt: new Date().toISOString(),
        });
      }

      const updated = await prisma.timetableGroup.update({
        where: { id: group.id },
        data: { members: JSON.stringify(members) },
      });

      return c.json({ ...updated, members: JSON.parse(updated.members) });
    },
  )

  // ── Auth: leave group ─────────────────────────────────────────────────────────
  .delete("/group/:code/leave", auth(["calendar"]), async (c) => {
    const userId = c.get("user").sub!;
    const { code } = c.req.param();
    const prisma = await prismaClients.fetch(c.env.DB);

    const group = await prisma.timetableGroup.findUnique({
      where: { inviteCode: code },
    });
    if (!group) throw new HTTPException(404, { message: "Group not found" });

    const members: Array<{ userId: string }> = JSON.parse(group.members);
    const updated = await prisma.timetableGroup.update({
      where: { id: group.id },
      data: {
        members: JSON.stringify(members.filter((m) => m.userId !== userId)),
      },
    });

    return c.json({ ...updated, members: JSON.parse(updated.members) });
  });

export default app;
