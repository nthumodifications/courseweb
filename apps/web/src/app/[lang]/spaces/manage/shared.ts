import useDictionary from "@/dictionaries/useDictionary";
import type { Organisation } from "../api";

export const formatTaipeiTime = (
  value: string,
  lang: string,
  withDate = true,
) =>
  new Intl.DateTimeFormat(
    lang === "en" ? "en" : lang === "zh-cn" ? "zh-CN" : "zh-TW",
    {
      timeZone: "Asia/Taipei",
      ...(withDate ? { dateStyle: "medium" as const } : {}),
      timeStyle: "short",
    },
  ).format(new Date(value));
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
