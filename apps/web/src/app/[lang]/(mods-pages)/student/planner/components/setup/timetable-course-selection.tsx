import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { decodeCourseText } from "@/lib/course-text";
import type { CourseDefinition } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import type { FolderDocType } from "../../rxdb";
import {
  dedupeTimetableCourses,
  enumerateTermsFromEnrollment,
  guessCourseCategory,
} from "../../lib/setup";
import { effectiveStatus, normalizeSemesterId } from "../../lib/progress";
import { formatPlannerSemester, formatPlannerText } from "../remake/shared";

export interface TimetableHistoryTerm {
  id: string;
  courses: CourseDefinition[];
}

export function usePlannerTimetableHistory(
  enrollmentYear: string,
  currentSemesterId: string,
) {
  const timetable = useUserTimetable();
  const current = normalizeSemesterId(currentSemesterId);
  const startYear = Number(enrollmentYear);
  const terms = useMemo(() => {
    const earliest = `${String(startYear).padStart(3, "0")}10`;
    const termsThroughNow = new Set(
      enumerateTermsFromEnrollment(startYear, current),
    );
    const candidates = Object.keys(timetable.courses)
      .map((id) => ({ id, normalized: normalizeSemesterId(id) }))
      .filter(
        ({ normalized }) =>
          /^\d{5}$/.test(normalized) && normalized >= earliest,
      )
      .sort((left, right) => right.normalized.localeCompare(left.normalized));

    const seenRawIds = new Set<string>();
    const result: TimetableHistoryTerm[] = [];
    for (const { id, normalized } of candidates) {
      const termInRange = termsThroughNow.has(normalized);
      // Timetable terms after the current one are included as planned terms.
      if (!termInRange && normalized <= current) continue;

      const courses = dedupeTimetableCourses(
        timetable.getSemesterCourses(id),
      ).filter((course) => {
        if (!course.raw_id) return true;
        if (seenRawIds.has(course.raw_id)) return false;
        seenRawIds.add(course.raw_id);
        return true;
      });
      if (courses.length > 0) result.push({ id: normalized, courses });
    }
    return result;
  }, [current, startYear, timetable.courses, timetable.getSemesterCourses]);

  return {
    terms,
    isReady: timetable.timetableDataReady && !timetable.isLoading,
    hasError: Boolean(timetable.error || timetable.timetableSyncError),
  };
}

export function selectedHistoryCourses(
  terms: TimetableHistoryTerm[],
  selectedTermIds: Set<string>,
): (CourseDefinition & { plannerSemester: string })[] {
  return terms.flatMap((term) =>
    selectedTermIds.has(term.id)
      ? term.courses.map((course) => ({ ...course, plannerSemester: term.id }))
      : [],
  );
}

interface TimetableCourseSelectionProps {
  terms: TimetableHistoryTerm[];
  currentSemesterId: string;
  folders: Pick<FolderDocType, "id" | "title" | "order">[];
  department: string;
  selectedTermIds: Set<string>;
  onToggleTerm: (termId: string, selected: boolean) => void;
  assignments: Record<string, string>;
  onAssignmentChange: (rawId: string, folderId: string) => void;
  lang: string;
}

export function TimetableCourseSelection({
  terms,
  currentSemesterId,
  folders,
  department,
  selectedTermIds,
  onToggleTerm,
  assignments,
  onAssignmentChange,
  lang,
}: TimetableCourseSelectionProps) {
  const dict = useDictionary();
  const t = dict.planner.setup;
  const now = normalizeSemesterId(currentSemesterId);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(
    () => new Set(),
  );

  const visibleFolders = useMemo(
    () =>
      folders
        .filter(
          (folder) => folder.id !== "planner-1" && folder.id !== "_unsorted",
        )
        .sort((left, right) => left.order - right.order),
    [folders],
  );
  const selectedCourses = selectedHistoryCourses(terms, selectedTermIds);
  const selectedCredits = selectedCourses.reduce(
    (sum, course) => sum + (course.credits ?? 0),
    0,
  );

  if (terms.length === 0) {
    return (
      <div className="space-y-2 rounded-md border border-border p-4">
        <p className="text-sm text-muted-foreground">{t.noTimetableHistory}</p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={`/${lang}/timetable`}>{t.openTimetable}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {formatPlannerText(t.importSummary, {
          courses: selectedCourses.length,
          credits: selectedCredits,
        })}
      </p>
      <div className="divide-y divide-border rounded-md border border-border">
        {terms.map((term) => {
          const selected = selectedTermIds.has(term.id);
          const expanded = expandedTerms.has(term.id);
          const credits = term.courses.reduce(
            (sum, course) => sum + (course.credits ?? 0),
            0,
          );
          const isCurrent = term.id === now;
          return (
            <section key={term.id} className="min-w-0 p-2">
              <div className="flex min-w-0 items-center gap-2">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) =>
                    onToggleTerm(term.id, checked === true)
                  }
                  aria-label={formatPlannerSemester(term.id)}
                />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  onClick={() =>
                    setExpandedTerms((previous) => {
                      const next = new Set(previous);
                      if (next.has(term.id)) next.delete(term.id);
                      else next.add(term.id);
                      return next;
                    })
                  }
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {formatPlannerSemester(term.id)}
                  </span>
                  {isCurrent && (
                    <span className="rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary">
                      {dict.planner.remake.currentTerm}
                    </span>
                  )}
                  <span className="truncate text-xs text-muted-foreground">
                    {formatPlannerText(t.termSummary, {
                      courses: term.courses.length,
                      credits,
                    })}
                  </span>
                </button>
              </div>
              {expanded && (
                <div className="ml-6 mt-2 space-y-2">
                  {term.courses.map((course) => {
                    const rawId =
                      course.raw_id ?? `${term.id}:${course.course}`;
                    const guessedFolder = guessCourseCategory(
                      course,
                      department,
                      folders,
                    );
                    const folderId = assignments[rawId] ?? guessedFolder;
                    const title = [course.name_zh, course.name_en]
                      .filter(Boolean)
                      .map(decodeCourseText);
                    const courseStatus = effectiveStatus(
                      { semester: term.id, status: "planned" },
                      now,
                    );
                    return (
                      <div
                        key={`${term.id}-${rawId}`}
                        className="flex min-w-0 flex-col gap-1.5 border-l border-border pl-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">{title.join(" ")}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              courseCodeFromCourse(course),
                              `${course.credits ?? 0} ${t.creditUnit}`,
                              t[`status_${courseStatus}`],
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Select
                          value={folderId}
                          onValueChange={(value) =>
                            onAssignmentChange(rawId, value)
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-full text-xs sm:w-40"
                            aria-label={t.categoryForCourse}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_unsorted">
                              {dict.planner.remake.noneCategory}
                            </SelectItem>
                            {visibleFolders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function courseCodeFromCourse(course: CourseDefinition) {
  if (/^\d{5}/.test(course.raw_id ?? "")) return course.raw_id.slice(5).trim();
  return `${course.department} ${course.course}${course.class}`.trim();
}
