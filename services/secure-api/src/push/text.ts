import type { PushLanguage } from "../api/push";
import type { CourseChangeRow } from "./courseChanges";

export type CourseName = {
  raw_id: string;
  name_zh: string;
  name_en: string;
};

export type CourseNotification = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type AnnouncementArticle = {
  title: string;
  link: string;
  date: string;
  sourceIds: string[];
};

const messages = {
  zh: {
    room: "教室變更",
    time: "上課時間變更",
    cancelled: "課程已取消",
    restored: "課程已恢復",
    updated: "課程資訊已更新",
    summary: (count: number) => `另有 ${count} 門課程有異動`,
    summaryTitle: "課表有更新",
    announcements: (count: number) => `${count} 則新公告`,
    testTitle: "NTHUMods 通知",
    testBody: "推播通知已正常運作。",
  },
  en: {
    room: "Room changed",
    time: "Class time changed",
    cancelled: "Course cancelled",
    restored: "Course restored",
    updated: "Course information changed",
    summary: (count: number) => `${count} more course changes`,
    summaryTitle: "Timetable updated",
    announcements: (count: number) => `${count} new announcements`,
    testTitle: "NTHUMods notifications",
    testBody: "Push notifications are working.",
  },
  "zh-cn": {
    room: "教室变更",
    time: "上课时间变更",
    cancelled: "课程已取消",
    restored: "课程已恢复",
    updated: "课程信息已更新",
    summary: (count: number) => `另有 ${count} 门课程有变更`,
    summaryTitle: "课表有更新",
    announcements: (count: number) => `${count} 条新公告`,
    testTitle: "NTHUMods 通知",
    testBody: "推送通知已正常运行。",
  },
} satisfies Record<
  PushLanguage,
  Record<string, string | ((count: number) => string)>
>;

const textValue = (
  value: unknown,
  field: string,
  language: PushLanguage,
): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    return value
      .map((item) => textValue(item, field, language))
      .join(field === "times" ? "" : ", ");
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const courseTitle = (
  course: CourseName | undefined,
  language: PushLanguage,
  rawId: string,
) => (language === "en" ? course?.name_en || rawId : course?.name_zh || rawId);

export const describeCourseChange = (
  change: CourseChangeRow,
  language: PushLanguage,
): string => {
  const localized = messages[language];
  if (change.kind === "removed") return localized.cancelled;
  if (change.kind === "reappeared") return localized.restored;
  if (change.field === "venues") {
    return `${localized.room}: ${textValue(change.old_value, change.field, language)} → ${textValue(change.new_value, change.field, language)}`;
  }
  if (change.field === "times") {
    return `${localized.time}: ${textValue(change.old_value, change.field, language)} → ${textValue(change.new_value, change.field, language)}`;
  }
  return localized.updated;
};

export const buildCourseNotification = (
  change: CourseChangeRow,
  course: CourseName | undefined,
  language: PushLanguage,
): CourseNotification => ({
  title: courseTitle(course, language, change.raw_id),
  body: describeCourseChange(change, language),
  url: `/${language}/courses/${encodeURIComponent(change.raw_id)}`,
  tag: `course-change:${change.raw_id}`,
});

export const buildCourseSummaryNotification = (
  count: number,
  language: PushLanguage,
): CourseNotification => ({
  title: messages[language].summaryTitle,
  body: messages[language].summary(count),
  url: `/${language}/timetable`,
  tag: "course-changes-summary",
});

export const buildAnnouncementNotification = (
  articles: readonly AnnouncementArticle[],
  language: PushLanguage,
): CourseNotification => ({
  title: messages[language].announcements(articles.length),
  body: articles
    .slice(0, 2)
    .map((article) => article.title)
    .join("\n"),
  url: `/${language}/announcements`,
  tag: "announcements-digest",
});

export const buildTestNotification = (
  language: PushLanguage,
): CourseNotification => ({
  title: messages[language].testTitle,
  body: messages[language].testBody,
  url: `/${language}/settings#notifications`,
  tag: "test",
});
