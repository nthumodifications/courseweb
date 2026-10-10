import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { lastSemester } from "@courseweb/shared";
import client from "@/config/api";
import {
  getTaipeiAcademicCalendarQuery,
  getTaipeiDateKey,
} from "@/helpers/dates";
import useTime from "@/hooks/useTime";
import {
  getCourseSelectionState,
  getCourseSelectionCalendarRange,
  parseCourseSelectionPeriods,
  type AcademicCalendarEvent,
  type CourseSelectionPeriod,
} from "@/lib/course-selection-periods";
import { useSettings } from "@/hooks/contexts/settings";

export type UseCourseSelectionPeriodsResult = {
  periods: CourseSelectionPeriod[];
  current: CourseSelectionPeriod[];
  next: CourseSelectionPeriod | null;
  nowDateKey: string;
  isLoading: boolean;
  error: Error | null;
};

const useCourseSelectionPeriods = (
  semester = lastSemester.id,
): UseCourseSelectionPeriodsResult => {
  const { showAcademicCalendar } = useSettings();
  const now = useTime(60_000);
  const nowDateKey = getTaipeiDateKey(now);
  const { startDateKey: rangeStart, endDateKey: rangeEnd } =
    getCourseSelectionCalendarRange(nowDateKey);
  const query = getTaipeiAcademicCalendarQuery(rangeStart, rangeEnd);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<AcademicCalendarEvent[], Error>({
    queryKey: ["course-selection-periods", rangeStart, rangeEnd],
    queryFn: async () => {
      if (!query) return [];
      const response = await client.acacalendar.$get({ query });
      return response.json();
    },
    enabled: showAcademicCalendar,
  });

  const periods = useMemo(
    () => (showAcademicCalendar ? parseCourseSelectionPeriods(data) : []),
    [data, showAcademicCalendar],
  );
  const { current, next } = useMemo(
    () => getCourseSelectionState(periods, semester, nowDateKey),
    [nowDateKey, periods, semester],
  );

  return {
    periods,
    current,
    next,
    nowDateKey,
    isLoading,
    error: error ?? null,
  };
};

export default useCourseSelectionPeriods;
