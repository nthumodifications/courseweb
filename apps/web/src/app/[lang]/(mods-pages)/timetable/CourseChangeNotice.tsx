import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Button } from "@courseweb/ui";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import type { CourseDefinition } from "@/config/supabase";
import {
  formatCourseChanges,
  parseCourseChanges,
  type CourseChangeLabels,
  type CourseChangeRecord,
} from "../courses/[courseId]/courseChanges";
import {
  getCourseChangesForNotice,
  selectUrgentCourseChanges,
} from "./changeNotice";

const SEEN_STORAGE_KEY = "course_change_notice_seen";
const MAX_SEEN_IDS = 500;

const readSeenIds = (): Set<number> => {
  try {
    const stored = globalThis.localStorage?.getItem(SEEN_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id),
        )
        .slice(-MAX_SEEN_IDS),
    );
  } catch {
    return new Set();
  }
};

const writeSeenIds = (ids: ReadonlySet<number>) => {
  try {
    globalThis.localStorage?.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify([...ids].slice(-MAX_SEEN_IDS)),
    );
  } catch {
    // localStorage may be unavailable or blocked; the notice still works in memory.
  }
};

const mostImportantChange = (changes: readonly CourseChangeRecord[]) =>
  changes.find((change) => change.kind === "removed") ??
  changes.find(
    (change) => change.kind === "changed" && change.field === "times",
  ) ??
  changes.find(
    (change) => change.kind === "changed" && change.field === "venues",
  ) ??
  changes.find((change) => change.kind === "reappeared");

type CourseChangeNoticeProps = {
  courses: readonly CourseDefinition[];
  semester: string | undefined;
};

const CourseChangeNotice = ({ courses, semester }: CourseChangeNoticeProps) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { lang } = useParams<{ lang: string }>();
  const [seenIds, setSeenIds] = useState(readSeenIds);
  const courseIds = useMemo(
    () => [...new Set(courses.map((course) => course.raw_id))].sort(),
    [courses],
  );
  const {
    data: changes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["course-change-notice", semester, courseIds],
    queryFn: async () => {
      const response = await client.course.changes["for-courses"].$get({
        query: { courses: courseIds, days: "14" },
      });
      if (!response.ok) throw new Error("Failed to load timetable changes");
      return parseCourseChanges(await response.json());
    },
    enabled: Boolean(semester) && courseIds.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const labels: CourseChangeLabels = {
    fields: dict.course.details.changes.fields,
    removed: dict.timetable.course_changes.removed,
    reappeared: dict.timetable.course_changes.reappeared,
    empty: dict.course.details.changes.empty,
    trueValue: dict.course.details.changes.true_value,
    falseValue: dict.course.details.changes.false_value,
    valueSeparator: dict.course.details.changes.value_separator,
    teacherField: language === "en" ? "teacher_en" : "teacher_zh",
  };
  const coursesById = useMemo(
    () => new Map(courses.map((course) => [course.raw_id, course])),
    [courses],
  );
  const notices = useMemo(
    () =>
      selectUrgentCourseChanges(
        getCourseChangesForNotice(changes, isLoading, error),
        seenIds,
      ).filter((notice) => coursesById.has(notice.raw_id)),
    [changes, coursesById, error, isLoading, seenIds],
  );

  if (notices.length === 0) return null;

  const markAllSeen = () => {
    setSeenIds((current) => {
      const next = new Set(current);
      for (const notice of notices) {
        for (const change of notice.changes) next.add(change.id);
      }
      const trimmed = new Set([...next].slice(-MAX_SEEN_IDS));
      writeSeenIds(trimmed);
      return trimmed;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          {(notices.length === 1
            ? dict.timetable.course_changes.summary_singular
            : dict.timetable.course_changes.summary
          ).replace("{count}", String(notices.length))}
        </p>
        <Button variant="ghost" size="sm" onClick={markAllSeen}>
          {dict.timetable.course_changes.dismiss}
        </Button>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {notices.map((notice) => {
          const course = coursesById.get(notice.raw_id);
          if (!course) return null;
          const formatted = formatCourseChanges(notice.changes, labels);
          const answer = formatted.find(
            (change) => change.id === mostImportantChange(notice.changes)?.id,
          );
          const details = formatted
            .map((change) =>
              change.statusLabel
                ? change.statusLabel
                : `${change.fieldLabel} ${change.oldValue} → ${change.newValue}`,
            )
            .join(dict.timetable.course_changes.change_separator);
          return (
            <Link
              key={notice.raw_id}
              to={`/${lang ?? language}/courses/${encodeURIComponent(notice.raw_id)}#changes`}
              className="flex flex-col gap-2 py-4"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-bold">
                  {language === "en" ? course.name_en : course.name_zh}
                </span>
                <span className="min-w-0 max-w-[45%] truncate whitespace-nowrap text-right font-bold">
                  {answer?.statusLabel ?? answer?.newValue}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                {details}
                {dict.timetable.course_changes.detail_date_separator}
                {formatted[0]?.dateLabel}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CourseChangeNotice;
