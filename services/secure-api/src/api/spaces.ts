import { zValidator } from "@hono/zod-validator";
import { BookingStatus, Prisma, type User } from "@prisma/client";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import prisma from "../client";
import { createUserRateLimiter } from "../middleware/userRateLimit";
import {
  canManageOrganisation,
  canReviewBookings,
  isPostgresExclusionViolation,
  validateBookingRules,
  type BookingRules,
} from "./spaces.rules";

type SpaceEnv = { Variables: { user: User } };
type SpaceDatabase = typeof prisma;

export type BookingNotifier = {
  notifyNewRequest: (input: {
    organisationName: string;
    discordWebhookUrl: string | null;
    spaceName: string;
    requesterName: string;
    startAt: Date;
    endAt: Date;
  }) => Promise<void>;
};

export const isValidDiscordWebhookUrl = (value: string) =>
  /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/u.test(value);

export const logBookingNotifier: BookingNotifier = {
  async notifyNewRequest(input) {
    console.info("New space booking request", {
      organisation: input.organisationName,
      space: input.spaceName,
      requester: input.requesterName,
      startAt: input.startAt.toISOString(),
      endAt: input.endAt.toISOString(),
    });
    if (
      !input.discordWebhookUrl ||
      !isValidDiscordWebhookUrl(input.discordWebhookUrl)
    )
      return;

    try {
      const response = await fetch(input.discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [
            {
              title: "New space booking request",
              fields: [
                { name: "Organisation", value: input.organisationName },
                { name: "Space", value: input.spaceName },
                { name: "Requester", value: input.requesterName },
                {
                  name: "Time",
                  value: `${input.startAt.toISOString()} – ${input.endAt.toISOString()}`,
                },
              ],
            },
          ],
        }),
      });
      if (!response.ok)
        console.error("Discord booking notification failed", response.status);
    } catch (error) {
      console.error("Discord booking notification failed", error);
    }
  },
};

const invalidInput = (
  result: { success: boolean },
  c: { json: (body: unknown, status: 400) => Response },
) => {
  if (!result.success) return c.json({ error: "invalid_input" }, 400);
};

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u);
const openingHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensAt: clockSchema,
    closesAt: clockSchema,
  })
  .refine((value) => value.opensAt < value.closesAt);
const blackoutSchema = z
  .object({
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    reason: z.string().trim().max(300).optional().nullable(),
  })
  .refine((value) => value.startDate <= value.endDate);
const webhookSchema = z
  .string()
  .trim()
  .url()
  .refine(isValidDiscordWebhookUrl)
  .nullable()
  .optional();

const organisationInput = z.object({
  name: z.string().trim().min(2).max(140),
  slug: slugSchema,
  description: z.string().trim().max(3000).default(""),
  contact: z.string().trim().min(1).max(300),
  discordWebhookUrl: webhookSchema,
});

const spaceFields = {
  name: z.string().trim().min(1).max(140),
  slug: slugSchema,
  description: z.string().trim().max(3000).default(""),
  location: z.string().trim().min(1).max(300),
  venueId: z.string().trim().max(200).nullable().optional(),
  isPublic: z.boolean().default(true),
  rules: z.string().trim().max(5000).default(""),
  whoCanBook: z.enum([
    "ANYONE_SIGNED_IN",
    "NTHU_ONLY",
    "MEMBERS",
    "ALLOW_LIST",
  ]),
  approvalMode: z.enum(["APPROVAL", "INSTANT"]),
  slotLengthMinutes: z.number().int().min(5).max(1440),
  minNoticeHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 365),
  maxLengthMinutes: z
    .number()
    .int()
    .min(5)
    .max(1440 * 31),
  maxActiveBookingsPerUser: z.number().int().min(1).max(100),
  requireBorrowingUnit: z.boolean().default(false),
  requirePurpose: z.boolean().default(true),
  requireHeadcount: z.boolean().default(false),
  openingHours: z
    .array(openingHourSchema)
    .max(7)
    .refine(
      (rows) => new Set(rows.map((row) => row.weekday)).size === rows.length,
    ),
  blackouts: z.array(blackoutSchema).max(200),
  allowList: z.array(z.string().trim().min(1).max(200)).max(500),
};
const spaceFieldsObject = z.object(spaceFields);
const spaceInput = spaceFieldsObject.refine(
  (value) => value.maxLengthMinutes >= value.slotLengthMinutes,
);
const spacePatchInput = spaceFieldsObject
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const bookingInput = z.object({
  spaceId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  borrowingUnit: z.string().trim().max(200).optional().nullable(),
  purpose: z.string().trim().max(2000).optional().nullable(),
  headcount: z.number().int().min(1).max(10000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
const memberInput = z.object({
  userIdentifier: z.string().trim().min(1).max(200),
  role: z.enum(["MANAGER", "APPROVER"]).default("APPROVER"),
});
const decisionInput = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});
const bulkDecisionInput = z.object({
  bookingIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});
const manageWeekQuery = z.object({
  spaceId: z.string().uuid(),
  start: dateKeySchema,
});

const lazyRequireAuth = (async (c, next) => {
  const { requireAuth } = await import("../middleware/requireAuth");
  return requireAuth()(c, next);
}) as MiddlewareHandler<SpaceEnv>;

const asDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
const nextDate = (date: Date) => new Date(date.getTime() + 7 * 86_400_000);
const dateString = (date: Date) => date.toISOString().slice(0, 10);
const toDateOnly = (value: Date) => value.toISOString().slice(0, 10);

const publicSpaceWhere = {
  isPublic: true,
  archivedAt: null,
  organisation: { status: "VERIFIED" as const },
};

const serializeSpace = (space: any) => ({
  id: space.id,
  organisationId: space.organisationId,
  slug: space.slug,
  name: space.name,
  description: space.description,
  location: space.location,
  venueId: space.venueId,
  isPublic: space.isPublic,
  rules: space.rules,
  whoCanBook: space.whoCanBook,
  approvalMode: space.approvalMode,
  slotLengthMinutes: space.slotLengthMinutes,
  minNoticeHours: space.minNoticeHours,
  maxLengthMinutes: space.maxLengthMinutes,
  maxActiveBookingsPerUser: space.maxActiveBookingsPerUser,
  requireBorrowingUnit: space.requireBorrowingUnit,
  requirePurpose: space.requirePurpose,
  requireHeadcount: space.requireHeadcount,
  openingHours: space.openingHours ?? [],
  blackouts: (space.blackouts ?? []).map((item: any) => ({
    ...item,
    startDate: toDateOnly(item.startDate),
    endDate: toDateOnly(item.endDate),
  })),
});

const resolveUserIdentifier = async (db: SpaceDatabase, identifier: string) =>
  db.user.findFirst({
    where: {
      OR: [
        { userId: identifier },
        { email: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { userId: true, name: true, email: true, inschool: true },
  });

const localWeekRange = (start: string) => {
  const startAt = new Date(`${start}T00:00:00+08:00`);
  return { startAt, endAt: new Date(startAt.getTime() + 7 * 86_400_000) };
};

const csvCell = (value: unknown) => {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

const isSlugUniqueViolation = (error: unknown) => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    (error as { code?: unknown }).code !== "P2002"
  )
    return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  if (target === undefined) return true;
  const targetName = Array.isArray(target) ? target.join("_") : String(target);
  return targetName.toLowerCase().includes("slug");
};

const requesterBookingSelect = {
  id: true,
  spaceId: true,
  startAt: true,
  endAt: true,
  status: true,
  borrowingUnit: true,
  purpose: true,
  headcount: true,
  notes: true,
  reason: true,
  createdAt: true,
  space: {
    select: {
      id: true,
      slug: true,
      name: true,
      organisation: { select: { name: true, slug: true } },
    },
  },
} as const;

const requesterMineSelect = {
  id: true,
  startAt: true,
  endAt: true,
  status: true,
  space: {
    select: {
      slug: true,
      name: true,
      organisation: { select: { name: true, slug: true } },
    },
  },
} as const;

const serializeRequesterBooking = (booking: any) => ({
  id: booking.id,
  startAt: booking.startAt,
  endAt: booking.endAt,
  status: booking.status,
  space: booking.space
    ? {
        slug: booking.space.slug,
        name: booking.space.name,
        organisation: booking.space.organisation
          ? {
              name: booking.space.organisation.name,
              slug: booking.space.organisation.slug,
            }
          : null,
      }
    : null,
});

const serializeRequesterBookingDetail = (booking: any) => ({
  ...serializeRequesterBooking(booking),
  spaceId: booking.spaceId,
  borrowingUnit: booking.borrowingUnit,
  purpose: booking.purpose,
  headcount: booking.headcount,
  notes: booking.notes,
  reason: booking.reason,
  createdAt: booking.createdAt,
  ...(booking.space
    ? {
        space: {
          id: booking.space.id,
          ...serializeRequesterBooking(booking).space,
        },
      }
    : {}),
});

const event = (
  bookingId: string,
  what: string,
  whoUserId: string | null,
  details?: unknown,
) => ({
  bookingId,
  what,
  whoUserId,
  ...(details ? { details: details as Prisma.InputJsonValue } : {}),
});

export type SpacesDependencies = {
  db?: SpaceDatabase;
  auth?: MiddlewareHandler<SpaceEnv>;
  rateLimit?: MiddlewareHandler<SpaceEnv>;
  notifier?: BookingNotifier;
};

export const createSpacesApp = ({
  db = prisma,
  auth = lazyRequireAuth,
  rateLimit = createUserRateLimiter({ capacity: 5, refillPerSecond: 1 / 60 })
    .middleware as MiddlewareHandler<SpaceEnv>,
  notifier = logBookingNotifier,
}: SpacesDependencies = {}) => {
  const app = new Hono<SpaceEnv>();

  app.get("/organisations", async (c) => {
    const organisations = await db.organisation.findMany({
      where: {
        status: "VERIFIED",
        spaces: { some: { isPublic: true, archivedAt: null } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        spaces: {
          where: { isPublic: true, archivedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            description: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return c.json({ organisations });
  });

  app.get("/organisations/:orgSlug/spaces/:spaceSlug", async (c) => {
    const space = await db.space.findFirst({
      where: {
        ...publicSpaceWhere,
        slug: c.req.param("spaceSlug"),
        organisation: { status: "VERIFIED", slug: c.req.param("orgSlug") },
      },
      include: {
        openingHours: { orderBy: { weekday: "asc" } },
        blackouts: true,
        organisation: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!space) return c.json({ error: "not_found" }, 404);
    return c.json({
      space: serializeSpace(space),
      organisation: space.organisation,
    });
  });

  app.get("/organisations/:orgSlug/spaces/:spaceSlug/week", async (c) => {
    const start = c.req.query("start");
    if (!start || !dateKeySchema.safeParse(start).success)
      return c.json({ error: "invalid_input" }, 400);
    const space = await db.space.findFirst({
      where: {
        ...publicSpaceWhere,
        slug: c.req.param("spaceSlug"),
        organisation: { status: "VERIFIED", slug: c.req.param("orgSlug") },
      },
      include: {
        openingHours: { orderBy: { weekday: "asc" } },
        blackouts: true,
      },
    });
    if (!space) return c.json({ error: "not_found" }, 404);
    const range = localWeekRange(start);
    const bookings = await db.booking.findMany({
      where: {
        spaceId: space.id,
        status: "APPROVED",
        startAt: { lt: range.endAt },
        endAt: { gt: range.startAt },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: "asc" },
    });
    return c.json({
      weekStart: start,
      weekEnd: dateString(nextDate(asDate(start))),
      space: serializeSpace(space),
      busy: bookings.map((booking) => ({
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        status: "booked" as const,
      })),
    });
  });

  app.get("/mine", auth, async (c) => {
    const user = c.get("user");
    const bookings = await db.booking.findMany({
      where: { userId: user.userId },
      select: requesterMineSelect,
      orderBy: { startAt: "desc" },
    });
    return c.json({
      bookings: bookings.map((booking) => serializeRequesterBooking(booking)),
    });
  });

  app.post(
    "/organisations",
    auth,
    zValidator("json", organisationInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");
      try {
        const result = await db.$transaction(async (tx) => {
          const organisation = await tx.organisation.create({
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description,
              contact: input.contact,
              discordWebhookUrl: input.discordWebhookUrl ?? null,
              createdBy: user.userId,
            },
          });
          await tx.organisationMember.create({
            data: {
              organisationId: organisation.id,
              userId: user.userId,
              role: "OWNER",
            },
          });
          return organisation;
        });
        return c.json({ organisation: result }, 201);
      } catch (error) {
        if (isSlugUniqueViolation(error))
          return c.json({ error: "slug_taken" }, 409);
        throw error;
      }
    },
  );

  app.get("/manage", auth, async (c) => {
    const user = c.get("user");
    const memberships = await db.organisationMember.findMany({
      where: { userId: user.userId },
      include: {
        organisation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    userId: true,
                    name: true,
                    nameEn: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            spaces: {
              where: { archivedAt: null },
              include: {
                openingHours: { orderBy: { weekday: "asc" } },
                blackouts: true,
                allowList: true,
              },
              orderBy: { name: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return c.json({
      organisations: memberships.map((row) => ({
        role: row.role,
        ...row.organisation,
        discordWebhookUrl: canManageOrganisation(row.role)
          ? row.organisation.discordWebhookUrl
          : null,
        members: canManageOrganisation(row.role)
          ? row.organisation.members
          : row.organisation.members.map(({ user, ...member }) => ({
              ...member,
              user: {
                userId: user.userId,
                name: user.name,
                nameEn: user.nameEn,
              },
            })),
        spaces: row.organisation.spaces.map((space) => ({
          ...serializeSpace(space),
          allowListUserIds: space.allowList.map((entry) => entry.userId),
        })),
      })),
    });
  });

  app.patch(
    "/organisations/:organisationId",
    auth,
    zValidator(
      "json",
      z
        .object({
          name: z.string().trim().min(2).max(140).optional(),
          description: z.string().trim().max(3000).optional(),
          contact: z.string().trim().min(1).max(300).optional(),
          discordWebhookUrl: webhookSchema,
        })
        .refine((value) => Object.keys(value).length > 0),
      invalidInput,
    ),
    async (c) => {
      const user = c.get("user");
      const organisationId = c.req.param("organisationId");
      const role = await db.organisationMember.findFirst({
        where: { organisationId, userId: user.userId },
        select: { role: true },
      });
      if (!canManageOrganisation(role?.role))
        return c.json({ error: "forbidden" }, 403);
      const input = c.req.valid("json");
      const organisation = await db.organisation.update({
        where: { id: organisationId },
        data: {
          ...input,
          ...(input.discordWebhookUrl !== undefined
            ? { discordWebhookUrl: input.discordWebhookUrl }
            : {}),
        },
      });
      return c.json({ organisation });
    },
  );

  app.post(
    "/organisations/:organisationId/members",
    auth,
    zValidator("json", memberInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const organisationId = c.req.param("organisationId");
      const input = c.req.valid("json");
      const invitee = await resolveUserIdentifier(db, input.userIdentifier);
      if (!invitee) return c.json({ error: "user_not_found" }, 404);
      const result = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organisationId} || ':members', 0))`;
        const membership = await tx.organisationMember.findFirst({
          where: { organisationId, userId: user.userId },
          select: { role: true },
        });
        if (!canManageOrganisation(membership?.role))
          return { error: "forbidden" as const };
        if (input.role === "MANAGER" && membership?.role !== "OWNER")
          return { error: "forbidden" as const };
        const existing = await tx.organisationMember.findFirst({
          where: { organisationId, userId: invitee.userId },
          select: { role: true },
        });
        if (
          existing?.role === "OWNER" ||
          (existing?.role === "MANAGER" && membership?.role !== "OWNER")
        )
          return { error: "forbidden" as const };
        const member = await tx.organisationMember.upsert({
          where: {
            organisationId_userId: { organisationId, userId: invitee.userId },
          },
          create: { organisationId, userId: invitee.userId, role: input.role },
          update: { role: input.role },
          include: {
            user: {
              select: { userId: true, name: true, nameEn: true, email: true },
            },
          },
        });
        return { member } as const;
      });
      if ("error" in result) return c.json({ error: result.error }, 403);
      return c.json({ member: result.member }, 201);
    },
  );

  app.delete(
    "/organisations/:organisationId/members/:userId",
    auth,
    async (c) => {
      const user = c.get("user");
      const organisationId = c.req.param("organisationId");
      const targetId = c.req.param("userId");
      const result = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organisationId} || ':members', 0))`;
        const membership = await tx.organisationMember.findFirst({
          where: { organisationId, userId: user.userId },
          select: { role: true },
        });
        const target = await tx.organisationMember.findFirst({
          where: { organisationId, userId: targetId },
          select: { id: true, role: true },
        });
        if (!target) return { error: "not_found" as const };
        const mayRemove =
          targetId === user.userId ||
          membership?.role === "OWNER" ||
          (membership?.role === "MANAGER" && target.role === "APPROVER");
        if (!mayRemove) return { error: "forbidden" as const };
        if (target.role === "OWNER") {
          const owners = await tx.organisationMember.count({
            where: { organisationId, role: "OWNER" },
          });
          if (owners <= 1) return { error: "last_owner" as const };
        }
        await tx.organisationMember.delete({ where: { id: target.id } });
        return { ok: true as const };
      });
      if ("error" in result)
        return c.json(
          { error: result.error },
          result.error === "not_found"
            ? 404
            : result.error === "forbidden"
              ? 403
              : 409,
        );
      return c.json({ ok: true });
    },
  );

  app.post(
    "/organisations/:organisationId/spaces",
    auth,
    zValidator("json", spaceInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const organisationId = c.req.param("organisationId");
      const membership = await db.organisationMember.findFirst({
        where: { organisationId, userId: user.userId },
        select: { role: true },
      });
      if (!canManageOrganisation(membership?.role))
        return c.json({ error: "forbidden" }, 403);
      const input = c.req.valid("json");
      const allowUsers = await Promise.all(
        input.allowList.map((identifier) =>
          resolveUserIdentifier(db, identifier),
        ),
      );
      if (allowUsers.some((person) => !person))
        return c.json({ error: "allow_list_user_not_found" }, 400);
      const {
        openingHours,
        blackouts,
        allowList: _allowList,
        ...fields
      } = input;
      try {
        const space = await db.space.create({
          data: {
            organisationId,
            ...fields,
            openingHours: { create: openingHours },
            blackouts: {
              create: blackouts.map((range) => ({
                ...range,
                startDate: asDate(range.startDate),
                endDate: asDate(range.endDate),
              })),
            },
            allowList: {
              create: allowUsers.map((person) => ({ userId: person!.userId })),
            },
          },
          include: { openingHours: true, blackouts: true },
        });
        return c.json({ space: serializeSpace(space) }, 201);
      } catch (error) {
        if (isSlugUniqueViolation(error))
          return c.json({ error: "slug_taken" }, 409);
        throw error;
      }
    },
  );

  app.patch(
    "/spaces/:spaceId",
    auth,
    zValidator("json", spacePatchInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const spaceId = c.req.param("spaceId");
      const current = await db.space.findUnique({
        where: { id: spaceId },
        select: {
          id: true,
          organisationId: true,
          slotLengthMinutes: true,
          maxLengthMinutes: true,
        },
      });
      if (!current) return c.json({ error: "not_found" }, 404);
      const membership = await db.organisationMember.findFirst({
        where: { organisationId: current.organisationId, userId: user.userId },
        select: { role: true },
      });
      if (!canManageOrganisation(membership?.role))
        return c.json({ error: "forbidden" }, 403);
      const input = c.req.valid("json");
      if (
        (input.maxLengthMinutes ?? current.maxLengthMinutes) <
        (input.slotLengthMinutes ?? current.slotLengthMinutes)
      ) {
        return c.json({ error: "invalid_input" }, 400);
      }
      const allowUsers = input.allowList
        ? await Promise.all(
            input.allowList.map((identifier) =>
              resolveUserIdentifier(db, identifier),
            ),
          )
        : undefined;
      if (allowUsers?.some((person) => !person))
        return c.json({ error: "allow_list_user_not_found" }, 400);
      const { openingHours, blackouts, allowList, ...fields } = input;
      try {
        const space = await db.$transaction(async (tx) => {
          if (openingHours)
            await tx.spaceOpeningHours.deleteMany({ where: { spaceId } });
          if (blackouts)
            await tx.spaceBlackout.deleteMany({ where: { spaceId } });
          if (allowList)
            await tx.spaceBookingAllowList.deleteMany({ where: { spaceId } });
          return tx.space.update({
            where: { id: spaceId },
            data: {
              ...fields,
              ...(openingHours
                ? { openingHours: { create: openingHours } }
                : {}),
              ...(blackouts
                ? {
                    blackouts: {
                      create: blackouts.map((range) => ({
                        ...range,
                        startDate: asDate(range.startDate),
                        endDate: asDate(range.endDate),
                      })),
                    },
                  }
                : {}),
              ...(allowList
                ? {
                    allowList: {
                      create: allowUsers!.map((person) => ({
                        userId: person!.userId,
                      })),
                    },
                  }
                : {}),
            },
            include: { openingHours: true, blackouts: true },
          });
        });
        return c.json({ space: serializeSpace(space) });
      } catch (error) {
        if (isSlugUniqueViolation(error))
          return c.json({ error: "slug_taken" }, 409);
        throw error;
      }
    },
  );

  app.delete("/spaces/:spaceId", auth, async (c) => {
    const user = c.get("user");
    const spaceId = c.req.param("spaceId");
    const space = await db.space.findUnique({
      where: { id: spaceId },
      select: { organisationId: true },
    });
    if (!space) return c.json({ error: "not_found" }, 404);
    const membership = await db.organisationMember.findFirst({
      where: { organisationId: space.organisationId, userId: user.userId },
      select: { role: true },
    });
    if (!canManageOrganisation(membership?.role))
      return c.json({ error: "forbidden" }, 403);
    await db.space.update({
      where: { id: spaceId },
      data: { archivedAt: new Date(), isPublic: false },
    });
    return c.json({ ok: true });
  });

  app.get("/organisations/:organisationId/requests", auth, async (c) => {
    const user = c.get("user");
    const organisationId = c.req.param("organisationId");
    const role = await db.organisationMember.findFirst({
      where: { organisationId, userId: user.userId },
      select: { role: true },
    });
    if (!canReviewBookings(role?.role))
      return c.json({ error: "forbidden" }, 403);
    const bookings = await db.booking.findMany({
      where: { status: "REQUESTED", space: { organisationId } },
      include: {
        user: { select: { userId: true, name: true, nameEn: true } },
        space: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return c.json({ bookings });
  });

  app.get(
    "/organisations/:organisationId/week",
    auth,
    zValidator("query", manageWeekQuery, invalidInput),
    async (c) => {
      const user = c.get("user");
      const organisationId = c.req.param("organisationId");
      const query = c.req.valid("query");
      const role = await db.organisationMember.findFirst({
        where: { organisationId, userId: user.userId },
        select: { role: true },
      });
      if (!canReviewBookings(role?.role))
        return c.json({ error: "forbidden" }, 403);
      const space = await db.space.findFirst({
        where: { id: query.spaceId, organisationId, archivedAt: null },
        include: { openingHours: true, blackouts: true },
      });
      if (!space) return c.json({ error: "not_found" }, 404);
      const range = localWeekRange(query.start);
      const bookings = await db.booking.findMany({
        where: {
          spaceId: space.id,
          status: { in: ["REQUESTED", "APPROVED"] },
          startAt: { lt: range.endAt },
          endAt: { gt: range.startAt },
        },
        include: {
          user: { select: { userId: true, name: true, nameEn: true } },
        },
        orderBy: { startAt: "asc" },
      });
      return c.json({
        weekStart: query.start,
        space: serializeSpace(space),
        bookings,
      });
    },
  );

  app.get("/organisations/:organisationId/bookings.csv", auth, async (c) => {
    const user = c.get("user");
    const organisationId = c.req.param("organisationId");
    const role = await db.organisationMember.findFirst({
      where: { organisationId, userId: user.userId },
      select: { role: true },
    });
    if (!canReviewBookings(role?.role))
      return c.json({ error: "forbidden" }, 403);
    const bookings = await db.booking.findMany({
      where: { space: { organisationId } },
      include: {
        user: { select: { userId: true, name: true } },
        space: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    });
    const rows = [
      [
        "space",
        "requester_name",
        "student_id",
        "start_at",
        "end_at",
        "status",
        "borrowing_unit",
        "purpose",
        "headcount",
        "notes",
        "reason",
      ],
      ...bookings.map((booking) => [
        booking.space.name,
        booking.user.name,
        booking.user.userId,
        booking.startAt.toISOString(),
        booking.endAt.toISOString(),
        booking.status,
        booking.borrowingUnit,
        booking.purpose,
        booking.headcount,
        booking.notes,
        booking.reason,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      'attachment; filename="space-bookings.csv"',
    );
    return c.body(`\uFEFF${rows}`);
  });

  app.post(
    "/bookings",
    auth,
    rateLimit,
    zValidator("json", bookingInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");
      const space = await db.space.findFirst({
        where: { id: input.spaceId, ...publicSpaceWhere },
        include: {
          openingHours: true,
          blackouts: true,
          organisation: {
            select: { id: true, name: true, discordWebhookUrl: true },
          },
          allowList: { where: { userId: user.userId }, select: { id: true } },
        },
      });
      if (!space) return c.json({ error: "not_found" }, 404);
      const membership = await db.organisationMember.findFirst({
        where: { organisationId: space.organisationId, userId: user.userId },
        select: { id: true },
      });
      const rules: BookingRules = {
        whoCanBook: space.whoCanBook,
        slotLengthMinutes: space.slotLengthMinutes,
        minNoticeHours: space.minNoticeHours,
        maxLengthMinutes: space.maxLengthMinutes,
        maxActiveBookingsPerUser: space.maxActiveBookingsPerUser,
        requireBorrowingUnit: space.requireBorrowingUnit,
        requirePurpose: space.requirePurpose,
        requireHeadcount: space.requireHeadcount,
        openingHours: space.openingHours,
        blackouts: space.blackouts.map((range) => ({
          startDate: toDateOnly(range.startDate),
          endDate: toDateOnly(range.endDate),
        })),
      };
      const candidate = {
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        borrowingUnit: input.borrowingUnit,
        purpose: input.purpose,
        headcount: input.headcount,
      };
      const ruleErrors = validateBookingRules(rules, candidate, {
        isNthuStudent: user.inschool,
        isOrganisationMember: Boolean(membership),
        isAllowListed: space.allowList.length > 0,
        activeBookingCount: 0,
      });
      if (ruleErrors.length > 0)
        return c.json(
          { error: "booking_rules_failed", violations: ruleErrors },
          400,
        );

      const status: BookingStatus =
        space.approvalMode === "INSTANT" ? "APPROVED" : "REQUESTED";
      try {
        const result = await db.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${space.id} || ':' || ${user.userId}, 0))`;
          const activeBookingCount = await tx.booking.count({
            where: {
              spaceId: space.id,
              userId: user.userId,
              status: { in: ["REQUESTED", "APPROVED"] },
              endAt: { gt: new Date() },
            },
          });
          const transactionRuleErrors = validateBookingRules(rules, candidate, {
            isNthuStudent: user.inschool,
            isOrganisationMember: Boolean(membership),
            isAllowListed: space.allowList.length > 0,
            activeBookingCount,
          });
          if (transactionRuleErrors.length > 0)
            return { ruleErrors: transactionRuleErrors } as const;
          const created = await tx.booking.create({
            data: {
              spaceId: space.id,
              userId: user.userId,
              startAt: candidate.startAt,
              endAt: candidate.endAt,
              status,
              borrowingUnit: input.borrowingUnit?.trim() || null,
              purpose: input.purpose?.trim() || null,
              headcount: input.headcount ?? null,
              notes: input.notes?.trim() || null,
            },
          });
          await tx.bookingEvent.create({
            data: event(created.id, "BOOKING_CREATED", user.userId, { status }),
          });
          if (status === "APPROVED") {
            await tx.bookingEvent.create({
              data: event(created.id, "BOOKING_APPROVED", user.userId),
            });
          }
          return { booking: created } as const;
        });
        if ("ruleErrors" in result)
          return c.json(
            { error: "booking_rules_failed", violations: result.ruleErrors },
            400,
          );
        if (status === "REQUESTED") {
          await notifier.notifyNewRequest({
            organisationName: space.organisation.name,
            discordWebhookUrl: space.organisation.discordWebhookUrl,
            spaceName: space.name,
            requesterName: user.name,
            startAt: candidate.startAt,
            endAt: candidate.endAt,
          });
        }
        return c.json({ booking: result.booking }, 201);
      } catch (error) {
        if (isPostgresExclusionViolation(error))
          return c.json({ error: "booking_conflict" }, 409);
        throw error;
      }
    },
  );

  app.get("/bookings/:bookingId", auth, async (c) => {
    const user = c.get("user");
    const booking = await db.booking.findFirst({
      where: { id: c.req.param("bookingId"), userId: user.userId },
      select: requesterBookingSelect,
    });
    if (!booking) return c.json({ error: "not_found" }, 404);
    return c.json({ booking: serializeRequesterBookingDetail(booking) });
  });

  app.post("/bookings/:bookingId/cancel", auth, async (c) => {
    const user = c.get("user");
    const bookingId = c.req.param("bookingId");
    const result = await db.$transaction(async (tx) => {
      const current = await tx.booking.findFirst({
        where: { id: bookingId, userId: user.userId },
      });
      if (!current) return { error: "not_found" as const };
      if (
        !["REQUESTED", "APPROVED"].includes(current.status) ||
        current.startAt <= new Date()
      )
        return { error: "cannot_cancel" as const };
      const update = await tx.booking.updateMany({
        where: { id: bookingId, userId: user.userId, status: current.status },
        data: { status: "CANCELLED" },
      });
      if (update.count === 0) return { error: "cannot_cancel" as const };
      await tx.bookingEvent.create({
        data: event(bookingId, "BOOKING_CANCELLED", user.userId),
      });
      return {
        booking: await tx.booking.findUnique({ where: { id: bookingId } }),
      };
    });
    if ("error" in result)
      return c.json(
        { error: result.error },
        result.error === "not_found" ? 404 : 409,
      );
    return c.json({ booking: result.booking });
  });

  const assertReviewer = async (organisationId: string, userId: string) => {
    const membership = await db.organisationMember.findFirst({
      where: { organisationId, userId },
      select: { role: true },
    });
    return canReviewBookings(membership?.role);
  };

  const decideBooking = async (
    bookingId: string,
    userId: string,
    action: "APPROVE" | "REJECT",
    reason?: string,
  ) =>
    db.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { space: { select: { organisationId: true } } },
      });
      if (!current) return { error: "not_found" as const };
      if (!(await assertReviewer(current.space.organisationId, userId)))
        return { error: "forbidden" as const };
      if (current.status !== "REQUESTED")
        return { error: "not_pending" as const };
      if (action === "APPROVE" && current.startAt <= new Date())
        return { error: "already_started" as const };
      const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
      const update = await tx.booking.updateMany({
        where: { id: bookingId, status: "REQUESTED" },
        data: {
          status,
          decidedBy: userId,
          decidedAt: new Date(),
          reason: reason?.trim() || null,
        },
      });
      if (update.count === 0) return { error: "not_pending" as const };
      await tx.bookingEvent.create({
        data: event(bookingId, `BOOKING_${status}`, userId, {
          reason: reason?.trim() || null,
        }),
      });
      return {
        booking: await tx.booking.findUnique({ where: { id: bookingId } }),
      };
    });

  app.post(
    "/bookings/:bookingId/decision",
    auth,
    zValidator("json", decisionInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");
      if (input.action === "REJECT" && !input.reason?.trim())
        return c.json({ error: "reason_required" }, 400);
      try {
        const result = await decideBooking(
          c.req.param("bookingId"),
          user.userId,
          input.action,
          input.reason,
        );
        if ("error" in result)
          return c.json(
            { error: result.error },
            result.error === "not_found"
              ? 404
              : result.error === "forbidden"
                ? 403
                : 409,
          );
        return c.json({ booking: result.booking });
      } catch (error) {
        if (isPostgresExclusionViolation(error))
          return c.json({ error: "booking_conflict" }, 409);
        throw error;
      }
    },
  );

  app.post(
    "/bookings/bulk-decision",
    auth,
    zValidator("json", bulkDecisionInput, invalidInput),
    async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");
      if (input.action === "REJECT" && !input.reason?.trim())
        return c.json({ error: "reason_required" }, 400);
      try {
        const result = await db.$transaction(async (tx) => {
          const selected = await tx.booking.findMany({
            where: { id: { in: input.bookingIds } },
            include: { space: { select: { organisationId: true } } },
          });
          if (
            selected.length !== input.bookingIds.length ||
            selected.some((booking) => booking.status !== "REQUESTED")
          )
            return { error: "not_pending" as const };
          if (
            input.action === "APPROVE" &&
            selected.some((booking) => booking.startAt <= new Date())
          )
            return { error: "already_started" as const };
          for (const organisationId of new Set(
            selected.map((booking) => booking.space.organisationId),
          )) {
            if (!(await assertReviewer(organisationId, user.userId)))
              return { error: "forbidden" as const };
          }
          const status = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
          const changed = await tx.booking.updateMany({
            where: { id: { in: input.bookingIds }, status: "REQUESTED" },
            data: {
              status,
              decidedBy: user.userId,
              decidedAt: new Date(),
              reason: input.reason?.trim() || null,
            },
          });
          if (changed.count !== input.bookingIds.length)
            return { error: "not_pending" as const };
          await tx.bookingEvent.createMany({
            data: input.bookingIds.map((id) =>
              event(id, `BOOKING_${status}`, user.userId, {
                reason: input.reason?.trim() || null,
              }),
            ),
          });
          return { count: changed.count };
        });
        if ("error" in result)
          return c.json(
            { error: result.error },
            result.error === "forbidden" ? 403 : 409,
          );
        return c.json({ updated: result.count });
      } catch (error) {
        if (isPostgresExclusionViolation(error))
          return c.json({ error: "booking_conflict" }, 409);
        throw error;
      }
    },
  );

  app.post("/bookings/:bookingId/no-show", auth, async (c) => {
    const user = c.get("user");
    const bookingId = c.req.param("bookingId");
    const result = await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { space: { select: { organisationId: true } } },
      });
      if (!booking) return { error: "not_found" as const };
      if (!(await assertReviewer(booking.space.organisationId, user.userId)))
        return { error: "forbidden" as const };
      if (booking.status !== "APPROVED")
        return { error: "not_approved" as const };
      if (booking.endAt > new Date()) return { error: "not_finished" as const };
      const result = await tx.booking.updateMany({
        where: { id: bookingId, status: "APPROVED" },
        data: {
          status: "NO_SHOW",
          decidedBy: user.userId,
          decidedAt: new Date(),
        },
      });
      if (!result.count) return { error: "not_approved" as const };
      await tx.bookingEvent.create({
        data: event(bookingId, "BOOKING_NO_SHOW", user.userId),
      });
      return { ok: true };
    });
    if ("error" in result)
      return c.json(
        { error: result.error },
        result.error === "not_found"
          ? 404
          : result.error === "forbidden"
            ? 403
            : 409,
      );
    return c.json(result);
  });

  return app;
};

export default createSpacesApp();
