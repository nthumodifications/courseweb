import { Prisma } from "@prisma/client";
import prisma from "../client";
import { getVapidConfig, type VapidConfig } from "../config/push";
import {
  getCourseChanges,
  getCourseNames,
  type CourseChangeRow,
} from "./courseChanges";
import {
  sendPush,
  type PushDatabase,
  type PushPayload,
  type PushSendOptions,
  type PushSubscriptionRecord,
} from "./sender";
import {
  buildAnnouncementNotification,
  buildCourseNotification,
  buildCourseSummaryNotification,
  type AnnouncementArticle,
  type CourseName,
} from "./text";
import {
  createUserStorageStore,
  resolveUserStorageMode,
  type UserStore,
} from "../storage/userStore";
import { getFirebaseAdminFromProcessEnv } from "../config/firebase_admin";
import type { PushLanguage } from "../api/push";

const NOTIFIER_INTERVAL_MS = 10 * 60 * 1000;
const COURSE_CHANGE_BATCH_SIZE = 1000;
const COURSE_NOTIFICATION_LIMIT = 5;
const ANNOUNCEMENTS_URL = "https://api.nthumods.com/announcements";
const TAIPEI_TIME_ZONE = "Asia/Taipei";

export type NotifierSubscription = PushSubscriptionRecord & {
  userId: string;
  language: PushLanguage;
  courseChanges: boolean;
  announcementSources: string[];
  lastCourseChangeId: bigint;
  lastDigestDate: string | null;
};

type NotifierPushStore = PushDatabase["pushSubscription"] & {
  findMany(args: unknown): Promise<NotifierSubscription[]>;
  update(args: unknown): Promise<unknown>;
};

type NotifierTransaction = Omit<PushDatabase, "pushSubscription"> & {
  pushSubscription: NotifierPushStore;
  $queryRaw<T>(query: unknown): Promise<T>;
};

type NotifierDatabase = NotifierTransaction & {
  $transaction<T>(
    callback: (transaction: NotifierTransaction) => Promise<T>,
  ): Promise<T>;
};

type NotifierDependencies = {
  db?: NotifierDatabase;
  vapid?: VapidConfig;
  userStore?: UserStore;
  fetcher?: typeof fetch;
  send?: typeof sendPush;
  now?: () => Date;
};

type AnnouncementResponse = {
  articles: AnnouncementArticle[];
};

const defaultDatabase = prisma as unknown as NotifierDatabase;

const languageOf = (value: string): PushLanguage =>
  value === "en" || value === "zh-cn" ? value : "zh";

const asTimetable = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([semester, courses]) =>
      Array.isArray(courses) &&
      courses.every((course) => typeof course === "string")
        ? [[semester, courses]]
        : [],
    ),
  );
};

export const selectCourseChanges = (
  changes: readonly CourseChangeRow[],
  timetable: Record<string, readonly string[]>,
  cursor: bigint,
) => {
  const latestByCourse = new Map<string, CourseChangeRow>();
  for (const change of changes) {
    const id = BigInt(change.id);
    if (id <= cursor || !timetable[change.semester]?.includes(change.raw_id))
      continue;
    const existing = latestByCourse.get(change.raw_id);
    if (!existing || BigInt(existing.id) < id)
      latestByCourse.set(change.raw_id, change);
  }
  return [...latestByCourse.values()].sort((a, b) =>
    BigInt(a.id) < BigInt(b.id) ? -1 : 1,
  );
};

export const buildCourseNotifications = (
  changes: readonly CourseChangeRow[],
  courses: ReadonlyMap<string, CourseName>,
  language: PushLanguage,
) => {
  const individual = changes
    .slice(0, COURSE_NOTIFICATION_LIMIT - 1)
    .map((change) =>
      buildCourseNotification(change, courses.get(change.raw_id), language),
    );
  if (changes.length <= COURSE_NOTIFICATION_LIMIT - 1) return individual;
  return [
    ...individual,
    buildCourseSummaryNotification(
      changes.length - individual.length,
      language,
    ),
  ];
};

const dateParts = (date: Date) => {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    formatted.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
};

export const selectAnnouncementDigest = (
  response: AnnouncementResponse,
  followedSourceIds: readonly string[],
  lastDigestDate: string | null,
  now: Date,
) => {
  const today = dateParts(now).date;
  const previousDate =
    lastDigestDate ??
    dateParts(new Date(now.getTime() - 24 * 60 * 60 * 1000)).date;
  const followed = new Set(followedSourceIds);
  return response.articles.filter(
    (article) =>
      (lastDigestDate
        ? article.date > previousDate
        : article.date >= previousDate) &&
      article.date <= today &&
      article.sourceIds.some((sourceId) => followed.has(sourceId)),
  );
};

export const shouldSendAnnouncementDigest = (
  lastDigestDate: string | null,
  now: Date,
) => {
  const parts = dateParts(now);
  return (
    (parts.hour > 8 || (parts.hour === 8 && parts.minute >= 0)) &&
    lastDigestDate !== parts.date
  );
};

const fetchAnnouncements = async (
  fetcher: typeof fetch,
): Promise<AnnouncementResponse> => {
  const response = await fetcher(ANNOUNCEMENTS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok)
    throw new Error(`Announcements returned ${response.status}`);
  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid announcements response");
  const articles = (payload as { articles?: unknown }).articles;
  if (!Array.isArray(articles))
    throw new Error("Invalid announcements articles");
  return {
    articles: articles.flatMap((article) => {
      if (!article || typeof article !== "object") return [];
      const value = article as Record<string, unknown>;
      return typeof value["title"] === "string" &&
        typeof value["link"] === "string" &&
        typeof value["date"] === "string" &&
        Array.isArray(value["sourceIds"]) &&
        value["sourceIds"].every((sourceId) => typeof sourceId === "string")
        ? [
            {
              title: value["title"],
              link: value["link"],
              date: value["date"],
              sourceIds: value["sourceIds"],
            },
          ]
        : [];
    }),
  };
};

const pushOptions = (ttl: number): PushSendOptions => ({ ttl });

export const createPushNotifier = (dependencies: NotifierDependencies = {}) => {
  const db = dependencies.db ?? defaultDatabase;
  const vapid = dependencies.vapid ?? getVapidConfig();
  const fetcher = dependencies.fetcher ?? fetch;
  const send = dependencies.send ?? sendPush;
  const now = dependencies.now ?? (() => new Date());
  const userStore =
    dependencies.userStore ??
    createUserStorageStore({
      mode: resolveUserStorageMode(),
      getFirestore: () => getFirebaseAdminFromProcessEnv().adminFirestore,
    });
  let running = false;

  const runUnlocked = async (transaction: NotifierTransaction) => {
    if (!vapid) return;
    const subscriptions = await transaction.pushSubscription.findMany({});
    const currentTime = now();
    const courseSubscriptions = subscriptions.filter(
      (subscription) => subscription.courseChanges,
    );
    const courseCursor =
      courseSubscriptions.length === 0
        ? null
        : courseSubscriptions.reduce(
            (minimum, subscription) =>
              subscription.lastCourseChangeId < minimum
                ? subscription.lastCourseChangeId
                : minimum,
            courseSubscriptions[0].lastCourseChangeId,
          );
    const changes =
      courseCursor === null
        ? []
        : await getCourseChanges(courseCursor, COURSE_CHANGE_BATCH_SIZE);
    const courseNames = await getCourseNames([
      ...new Set(changes.map((change) => change.raw_id)),
    ]);
    const timetableCache = new Map<string, Record<string, string[]>>();
    const announcementCache = new Map<
      PushLanguage,
      Promise<AnnouncementResponse>
    >();

    for (const subscription of subscriptions) {
      const language = languageOf(subscription.language);
      if (subscription.courseChanges && changes.length > 0) {
        let timetable = timetableCache.get(subscription.userId);
        if (!timetable) {
          try {
            timetable = asTimetable(
              (await userStore.get(subscription.userId, "courses"))?.value,
            );
          } catch (error) {
            console.error(
              "Failed to read timetable for push notification",
              error instanceof Error ? error.message : error,
            );
            timetable = {};
          }
        }
        timetableCache.set(subscription.userId, timetable);
        const matchingChanges = selectCourseChanges(
          changes,
          timetable,
          subscription.lastCourseChangeId,
        );
        try {
          for (const notification of buildCourseNotifications(
            matchingChanges,
            courseNames,
            language,
          )) {
            await send(
              subscription,
              notification as PushPayload,
              pushOptions(24 * 60 * 60),
              { db: transaction, vapid },
            );
          }
        } finally {
          const maxId = changes.reduce((maximum, change) => {
            const id = BigInt(change.id);
            return id > maximum ? id : maximum;
          }, subscription.lastCourseChangeId);
          if (maxId > subscription.lastCourseChangeId) {
            await transaction.pushSubscription.update({
              where: { id: subscription.id },
              data: { lastCourseChangeId: maxId },
            });
          }
        }
      }

      if (
        !subscription.announcementSources.length ||
        !shouldSendAnnouncementDigest(subscription.lastDigestDate, currentTime)
      ) {
        continue;
      }
      const today = dateParts(currentTime).date;
      try {
        const cached =
          announcementCache.get(language) ?? fetchAnnouncements(fetcher);
        announcementCache.set(language, cached);
        const response = await cached;
        const articles = selectAnnouncementDigest(
          response,
          subscription.announcementSources,
          subscription.lastDigestDate,
          currentTime,
        );
        if (articles.length > 0) {
          await send(
            subscription,
            buildAnnouncementNotification(articles, language) as PushPayload,
            pushOptions(12 * 60 * 60),
            { db: transaction, vapid },
          );
        }
      } catch (error) {
        console.error(
          "Failed to prepare announcement digest",
          error instanceof Error ? error.message : error,
        );
      } finally {
        await transaction.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastDigestDate: today },
        });
      }
    }
  };

  const run = async () => {
    if (running) return false;
    running = true;
    try {
      return await db.$transaction(async (transaction) => {
        const result = await transaction.$queryRaw<{ locked: boolean }[]>(
          Prisma.sql`SELECT pg_try_advisory_lock(hashtext('nthumods:push-notifier')) AS locked`,
        );
        if (!result[0]?.locked) return false;
        try {
          await runUnlocked(transaction);
          return true;
        } finally {
          await transaction.$queryRaw(
            Prisma.sql`SELECT pg_advisory_unlock(hashtext('nthumods:push-notifier'))`,
          );
        }
      });
    } finally {
      running = false;
    }
  };

  return { run };
};

export const startPushNotifier = (dependencies: NotifierDependencies = {}) => {
  const notifier = createPushNotifier(dependencies);
  const timer = setInterval(() => void notifier.run(), NOTIFIER_INTERVAL_MS);
  void notifier.run();
  return { stop: () => clearInterval(timer), run: notifier.run };
};
