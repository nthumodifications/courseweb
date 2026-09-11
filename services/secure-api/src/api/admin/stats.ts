import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase from "../../config/supabase";
import type { AdminEnv } from "./env";

const prisma = new PrismaClient();

const startOfDaysAgo = (days: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

/**
 * Count rows in a Supabase table without transferring them.
 *
 * The content tables are in a different database from the auth tables, and a
 * failing count there should not take the whole dashboard down with it: an
 * unreachable table reports `null` and the UI shows a dash.
 */
const countTable = async (table: string): Promise<number | null> => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`admin stats: failed to count ${table}`, error.message);
    return null;
  }
  return count ?? 0;
};

type DailyBucket = { day: string; count: number };

/**
 * Daily signup counts, zero-filled.
 *
 * `date_trunc` only emits days that actually have rows, which draws a chart
 * where a quiet Sunday silently becomes a straight line between Saturday and
 * Monday instead of a dip to zero.
 */
const signupSeries = async (days: number): Promise<DailyBucket[]> => {
  const since = startOfDaysAgo(days - 1);
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "User"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const counts = new Map(
    rows.map((row) => [row.day.toISOString().slice(0, 10), Number(row.count)]),
  );

  const series: DailyBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = startOfDaysAgo(offset).toISOString().slice(0, 10);
    series.push({ day, count: counts.get(day) ?? 0 });
  }
  return series;
};

const app = new Hono<AdminEnv>()
  // Headline numbers for the admin overview.
  .get("/", async (c) => {
    const now = new Date();
    const last7 = startOfDaysAgo(7);
    const last30 = startOfDaysAgo(30);

    const [
      totalUsers,
      newUsers7d,
      newUsers30d,
      bannedUsers,
      admins,
      activeSessions,
      activeAccessTokens,
      activeRefreshTokens,
      activeApiKeys,
      activeShareTokens,
      clients,
      consents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERUSER"] } } }),
      prisma.authSessions.count({
        where: { state: "AUTHENTICATED", expiresAt: { gt: now } },
      }),
      prisma.token.count({ where: { type: "ACCESS", expiresAt: { gt: now } } }),
      prisma.token.count({
        where: { type: "REFRESH", expiresAt: { gt: now } },
      }),
      prisma.apiKey.count({ where: { isRevoked: false } }),
      prisma.calendarShareToken.count({ where: { revokedAt: null } }),
      prisma.client.count(),
      prisma.clientConsent.count(),
    ]);

    // "Active" here means a session that was used recently enough to be a fair
    // proxy for a returning student; sessions live 180 days, so their bare
    // count would only ever go up.
    const [activeUsers7d, activeUsers30d] = await Promise.all([
      prisma.token
        .findMany({
          where: { createdAt: { gte: last7 } },
          distinct: ["userId"],
          select: { userId: true },
        })
        .then((rows) => rows.length),
      prisma.token
        .findMany({
          where: { createdAt: { gte: last30 } },
          distinct: ["userId"],
          select: { userId: true },
        })
        .then((rows) => rows.length),
    ]);

    const [courses, comments, delayReports, alerts, contentUsers] =
      await Promise.all([
        countTable("courses"),
        countTable("course_comments"),
        countTable("delay_reports"),
        countTable("alerts"),
        countTable("users"),
      ]);

    return c.json({
      accounts: {
        total: totalUsers,
        new7d: newUsers7d,
        new30d: newUsers30d,
        banned: bannedUsers,
        admins,
        active7d: activeUsers7d,
        active30d: activeUsers30d,
      },
      sessions: {
        active: activeSessions,
        accessTokens: activeAccessTokens,
        refreshTokens: activeRefreshTokens,
        apiKeys: activeApiKeys,
        calendarShareTokens: activeShareTokens,
      },
      oauth: {
        clients,
        consents,
      },
      content: {
        courses,
        comments,
        delayReports,
        alerts,
        contentUsers,
      },
    });
  })

  // Signup trend for the overview chart.
  .get(
    "/signups",
    zValidator(
      "query",
      z.object({
        days: z.coerce.number().int().min(7).max(365).default(30),
      }),
    ),
    async (c) => {
      const { days } = c.req.valid("query");
      return c.json({ days, series: await signupSeries(days) });
    },
  )

  // Which OAuth clients traffic is actually coming through.
  .get("/clients", async (c) => {
    const since = startOfDaysAgo(30);
    const [grouped, clients] = await Promise.all([
      prisma.token.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.client.findMany({
        select: { clientId: true, name: true, firstParty: true },
      }),
    ]);

    const names = new Map(clients.map((client) => [client.clientId, client]));

    return c.json(
      grouped
        .map((row) => ({
          clientId: row.clientId,
          name: names.get(row.clientId)?.name ?? null,
          firstParty: names.get(row.clientId)?.firstParty ?? false,
          tokens: row._count._all,
        }))
        .sort((a, b) => b.tokens - a.tokens),
    );
  });

export default app;
