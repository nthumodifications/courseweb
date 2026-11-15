import { TIME_DAYS, TIME_PERIODS } from "@/lib/local-search/time-mask";
import type { ContentLanguage } from "@/helpers/contentLanguage";

const DAY_LABELS: Record<
  ContentLanguage,
  Record<(typeof TIME_DAYS)[number], string>
> = {
  zh: { M: "一", T: "二", W: "三", R: "四", F: "五", S: "六", U: "日" },
  en: {
    M: "Mon",
    T: "Tue",
    W: "Wed",
    R: "Thu",
    F: "Fri",
    S: "Sat",
    U: "Sun",
  },
};

const formatPeriods = (periods: readonly string[]) => {
  const ranges: string[] = [];
  let start = periods[0];
  let end = start;
  let endIndex = TIME_PERIODS.indexOf(end as (typeof TIME_PERIODS)[number]);

  for (const period of periods.slice(1)) {
    const index = TIME_PERIODS.indexOf(period as (typeof TIME_PERIODS)[number]);
    if (index === endIndex + 1) {
      end = period;
      endIndex = index;
      continue;
    }

    ranges.push(start === end ? start : `${start}–${end}`);
    start = period;
    end = period;
    endIndex = index;
  }

  if (start !== undefined && end !== undefined) {
    ranges.push(start === end ? start : `${start}–${end}`);
  }

  return ranges.join(", ");
};

/** Format compact NTHU schedule codes in weekday and period order. */
export const formatCourseTime = (time: string, language: ContentLanguage) => {
  const compactTime = time.replace(/\s+/g, "");
  if (!/^(?:[MTWRFSU][1-9nabcd])*$/i.test(compactTime)) return time;

  const periodsByDay = new Map<(typeof TIME_DAYS)[number], Set<string>>();
  for (const [, rawDay, rawPeriod] of compactTime.matchAll(
    /([MTWRFSU])([1-9nabcd])/gi,
  )) {
    const day = rawDay.toUpperCase() as (typeof TIME_DAYS)[number];
    const period = rawPeriod.toLowerCase();
    const periods = periodsByDay.get(day) ?? new Set<string>();
    periods.add(period);
    periodsByDay.set(day, periods);
  }

  if (periodsByDay.size === 0) return time;

  return TIME_DAYS.flatMap((day) => {
    const periods = periodsByDay.get(day);
    if (!periods) return [];

    const orderedPeriods = TIME_PERIODS.filter((period) => periods.has(period));
    return [`${DAY_LABELS[language][day]} ${formatPeriods(orderedPeriods)}`];
  }).join(" · ");
};
