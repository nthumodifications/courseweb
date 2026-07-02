import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import client from "@/config/api";

export type CourseDate = {
  raw_id: string;
  id: number;
  type: string;
  title: string;
  date: string;
};

const useCourseDates = (courseIds: string[]) => {
  const sortedIds = useMemo(() => [...courseIds].sort(), [courseIds]);

  const { data = [] } = useQuery<CourseDate[]>({
    queryKey: ["course-dates", ...sortedIds],
    queryFn: async () => {
      const res = await client.course.dates.$get({
        query: { courses: sortedIds },
      });
      return res.json();
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const dateMap = useMemo(() => {
    const map = new Map<string, CourseDate[]>();
    for (const d of data) {
      if (!map.has(d.raw_id)) map.set(d.raw_id, []);
      map.get(d.raw_id)!.push(d);
    }
    return map;
  }, [data]);

  const getCourseDateForDay = useCallback(
    (rawId: string, day: Date): CourseDate | null => {
      const dates = dateMap.get(rawId) ?? [];
      return dates.find((d) => isSameDay(new Date(d.date), day)) ?? null;
    },
    [dateMap],
  );

  return { getCourseDateForDay };
};

export default useCourseDates;
