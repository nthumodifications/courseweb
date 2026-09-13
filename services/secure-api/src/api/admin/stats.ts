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
  // `estimated` reads the planner's row estimate and falls back to an exact
  // count only for small tables. An exact count of `courses` is a full scan of
  // six figures of rows, which on its own took the whole overview past Bun's
  // 10s idle timeout; a dashboard tile does not need the last digit.
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "estimated", head: true });
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

    // One round trip, not thirteen.
    //
    // DATABASE_URL goes through pgbouncer, which pins Prisma to a single
    // connection, so a `Promise.all` of separate counts does not run in
    // parallel — it queues. Thirteen queued counts against ap-southeast-1 took
    // twelve seconds and tripped Bun's 10s idle timeout before this was one
    // statement.
    //
    // COUNT(DISTINCT ...) on Token is likewise done here rather than through
    // Prisma's `distinct`, which fetches every matching row to de-duplicate it
    // in the application.
    const [totals] = await prisma.$queryRaw<
      {
        total_users: bigint;
        new_users_7d: bigint;
        new_users_30d: bigint;
        banned_users: bigint;
        admins: bigint;
        active_sessions: bigint;
        access_tokens: bigint;
        refresh_tokens: bigint;
        api_keys: bigint;
        share_tokens: bigint;
        clients: bigint;
        consents: bigint;
        active_7d: bigint;
        active_30d: bigint;
      }[]
    >`
      SELECT
        (SELECT COUNT(*) FROM "User") AS total_users,
        (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= ${last7}) AS new_users_7d,
        (SELECT COUNT(*) FROM "User" WHERE "createdAt" >= ${last30}) AS new_users_30d,
        (SELECT COUNT(*) FROM "User" WHERE "banned" IS TRUE) AS banned_users,
        (SELECT COUNT(*) FROM "User" WHERE "role" <> 'USER') AS admins,
        (SELECT COUNT(*) FROM "AuthSessions" WHERE "state" = 'AUTHENTICATED' AND "expiresAt" > ${now}) AS active_sessions,
        (SELECT COUNT(*) FROM "Token" WHERE "type" = 'ACCESS' AND "expiresAt" > ${now}) AS access_tokens,
        (SELECT COUNT(*) FROM "Token" WHERE "type" = 'REFRESH' AND "expiresAt" > ${now}) AS refresh_tokens,
        (SELECT COUNT(*) FROM "ApiKey" WHERE "isRevoked" IS FALSE) AS api_keys,
        (SELECT COUNT(*) FROM "CalendarShareToken" WHERE "revokedAt" IS NULL) AS share_tokens,
        (SELECT COUNT(*) FROM "Client") AS clients,
        (SELECT COUNT(*) FROM "ClientConsent") AS consents,
        (SELECT COUNT(DISTINCT "userId") FROM "Token" WHERE "createdAt" >= ${last7}) AS active_7d,
        (SELECT COUNT(DISTINCT "userId") FROM "Token" WHERE "createdAt" >= ${last30}) AS active_30d
    `;

    const n = (value: bigint | undefined) => Number(value ?? 0);

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
        total: n(totals?.total_users),
        new7d: n(totals?.new_users_7d),
        new30d: n(totals?.new_users_30d),
        banned: n(totals?.banned_users),
        admins: n(totals?.admins),
        active7d: n(totals?.active_7d),
        active30d: n(totals?.active_30d),
      },
      sessions: {
        active: n(totals?.active_sessions),
        accessTokens: n(totals?.access_tokens),
        refreshTokens: n(totals?.refresh_tokens),
        apiKeys: n(totals?.api_keys),
        calendarShareTokens: n(totals?.share_tokens),
      },
      oauth: {
        clients: n(totals?.clients),
        consents: n(totals?.consents),
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
