import useDictionary from "@/dictionaries/useDictionary";
import type { Organisation } from "../api";

const taipeiTimeZone = "Asia/Taipei";
const localeForLanguage = (lang: string) =>
  lang === "en" ? "en-US" : lang === "zh-cn" ? "zh-CN" : "zh-TW";

export const formatTaipeiTime = (
  value: string,
  lang: string,
  withDate = true,
) =>
  new Intl.DateTimeFormat(localeForLanguage(lang), {
    timeZone: taipeiTimeZone,
    ...(withDate ? { dateStyle: "medium" as const } : {}),
    timeStyle: "short",
  }).format(new Date(value));

const taipeiDateParts = (date: Date, locale: string) => {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: taipeiTimeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: get("weekday"),
  };
};

export const formatTaipeiBookingRange = (
  startAt: string,
  endAt: string,
  lang: string,
) => {
  const locale = localeForLanguage(lang);
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startDate = taipeiDateParts(start, locale);
  const endDate = taipeiDateParts(end, locale);
  const currentYear = taipeiDateParts(new Date(), locale).year;
  const sameDay =
    startDate.year === endDate.year &&
    startDate.month === endDate.month &&
    startDate.day === endDate.day;
  const dateLabel = (date: Date, parts: ReturnType<typeof taipeiDateParts>) => {
    const includeYear = parts.year !== currentYear;
    if (lang === "en") {
      return new Intl.DateTimeFormat(locale, {
        timeZone: taipeiTimeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" as const } : {}),
      }).format(date);
    }
    return `${includeYear ? `${parts.year}年` : ""}${parts.month}月${parts.day}日（${parts.weekday}）`;
  };
  const timeLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: taipeiTimeZone,
      hour: lang === "en" ? "numeric" : "2-digit",
      minute: "2-digit",
      ...(lang === "en"
        ? { hour12: true as const }
        : { hourCycle: "h23" as const }),
    }).format(date);
  const startLabel = dateLabel(start, startDate);
  const startTime = timeLabel(start);
  const endTime = timeLabel(end);

  if (sameDay) {
    return lang === "en"
      ? `${startLabel}, ${startTime}–${endTime}`
      : `${startLabel}${startTime}–${endTime}`;
  }
  const endLabel = dateLabel(end, endDate);
  return lang === "en"
    ? `${startLabel}, ${startTime} – ${endLabel}, ${endTime}`
    : `${startLabel} ${startTime}–${endLabel} ${endTime}`;
};

export const weekdays = (dict: ReturnType<typeof useDictionary>) =>
  dict.spaces.weekdays as string[];
export const statusText = (
  status: Organisation["status"],
  dict: ReturnType<typeof useDictionary>,
) =>
  ({
    PENDING: dict.spaces.pending,
    VERIFIED: dict.spaces.verified,
    REJECTED: dict.spaces.rejectedStatus,
    SUSPENDED: dict.spaces.suspended,
  })[status];
