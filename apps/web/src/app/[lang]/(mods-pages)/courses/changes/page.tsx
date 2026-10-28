import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  currentSemester,
  departments,
  lastSemester,
  toPrettySemester,
} from "@courseweb/shared";
import {
  Button,
  EmptyState,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import client from "@/config/api";
import {
  filterCourseChanges,
  formatCourseChanges,
  getCourseChangeCourseName,
  groupCourseChanges,
  parseCourseChanges,
  type CourseChangeLabels,
} from "../[courseId]/courseChanges";
import { useQuery } from "@tanstack/react-query";

const CHANGE_DAY_OPTIONS = [7, 14, 30] as const;
type ChangeDays = (typeof CHANGE_DAY_OPTIONS)[number];

const getValidDays = (value: string | null): ChangeDays => {
  const days = Number(value);
  return CHANGE_DAY_OPTIONS.includes(days as ChangeDays)
    ? (days as ChangeDays)
    : 7;
};

const CourseChangesFeedPage = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const semester = currentSemester?.id ?? lastSemester.id;
  const departmentCodes = useMemo(
    () => new Set(departments.map((department) => department.code)),
    [],
  );
  const days = getValidDays(searchParams.get("days"));
  const requestedDepartment = searchParams.get("department");
  const department =
    requestedDepartment && departmentCodes.has(requestedDepartment)
      ? requestedDepartment
      : "all";
  const {
    data: changes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["course-changes", semester, days, department],
    queryFn: async () => {
      const response = await client.course.changes.$get({
        query: {
          semester,
          days: String(days),
          ...(department === "all" ? {} : { department }),
        },
      });
      if (!response.ok) throw new Error("Failed to load course changes");
      return parseCourseChanges(await response.json());
    },
    retry: false,
  });

  const changeLabels: CourseChangeLabels = {
    fields: dict.course.details.changes.fields,
    removed: dict.course.details.changes.removed,
    reappeared: dict.course.details.changes.reappeared,
    empty: dict.course.details.changes.empty,
    trueValue: dict.course.details.changes.true_value,
    falseValue: dict.course.details.changes.false_value,
    valueSeparator: dict.course.details.changes.value_separator,
    teacherField: language === "en" ? "teacher_en" : "teacher_zh",
  };
  const groups = useMemo(
    () => groupCourseChanges(filterCourseChanges(changes)),
    [changes],
  );

  const updateSearchParam = (name: string, value: string, allValue: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === allValue) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="flex flex-col px-4 md:px-6">
      <div className="flex flex-col gap-3 border-b border-border py-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-bold">{dict.course_changes.title}</h1>
          <span className="text-sm text-muted-foreground">
            {toPrettySemester(semester)}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={String(days)}
            onValueChange={(value) => updateSearchParam("days", value, "7")}
          >
            <SelectTrigger
              className="min-w-0 flex-1 sm:w-[140px] sm:flex-none"
              aria-label={dict.course_changes.days_label}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGE_DAY_OPTIONS.map((option) => (
                <SelectItem value={String(option)} key={option}>
                  {
                    dict.course_changes[
                      `days_${option}` as "days_7" | "days_14" | "days_30"
                    ]
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={department}
            onValueChange={(value) =>
              updateSearchParam("department", value, "all")
            }
          >
            <SelectTrigger
              className="min-w-0 flex-1 sm:w-[260px] sm:flex-none"
              aria-label={dict.course_changes.department_label}
            >
              <SelectValue placeholder={dict.course_changes.all_departments} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {dict.course_changes.all_departments}
              </SelectItem>
              {departments.map((option) => (
                <SelectItem value={option.code} key={option.code}>
                  {option.code} ·{" "}
                  {language === "en" ? option.name_en : option.name_zh}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div
          className="flex flex-col divide-y divide-border"
          aria-label={dict.common.loading}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div className="flex flex-col gap-2 py-4" key={index}>
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title={dict.common.load_error}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {dict.common.try_again}
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState title={dict.course_changes.no_results} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {groups.map((departmentGroup) => (
            <section
              className="flex flex-col py-4"
              key={departmentGroup.department}
            >
              <h2 className="mb-2 font-bold">
                {departmentGroup.department}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {departments.find(
                    (item) => item.code === departmentGroup.department,
                  )?.[language === "en" ? "name_en" : "name_zh"] ?? ""}
                </span>
              </h2>
              <div className="flex flex-col divide-y divide-border">
                {departmentGroup.courses.map((courseGroup) => {
                  const formattedChanges = formatCourseChanges(
                    courseGroup.changes,
                    changeLabels,
                  );
                  const courseName =
                    getCourseChangeCourseName(
                      courseGroup.course,
                      language === "en" ? "en" : "zh",
                    ) || dict.course_changes.course_fallback;
                  return (
                    <div
                      className="flex flex-col gap-1 py-2"
                      key={courseGroup.rawId}
                    >
                      <Link
                        className="flex flex-wrap items-baseline gap-2"
                        to={`/${language}/courses/${encodeURIComponent(courseGroup.rawId)}`}
                      >
                        <span className="font-bold">{courseName}</span>
                        <span className="text-sm text-muted-foreground">
                          {courseGroup.rawId}
                        </span>
                      </Link>
                      <div className="flex flex-col">
                        {formattedChanges.map((change) => (
                          <article
                            key={change.id}
                            className="flex flex-wrap items-baseline gap-2 py-1 text-sm"
                          >
                            <time className="shrink-0 text-muted-foreground">
                              {change.dateLabel}
                            </time>
                            <span
                              className="text-muted-foreground"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            {change.isCourseStatus ? (
                              <span>{change.statusLabel}</span>
                            ) : (
                              <>
                                <span className="font-medium">
                                  {change.fieldLabel}
                                </span>
                                <span
                                  className="text-muted-foreground"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                                {change.statusLabel ? (
                                  <span>{change.statusLabel}</span>
                                ) : (
                                  <span className="whitespace-pre-line">
                                    <span className="text-muted-foreground">
                                      {change.oldValue}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      →
                                    </span>{" "}
                                    <span className="text-foreground">
                                      {change.newValue}
                                    </span>
                                  </span>
                                )}
                              </>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="h-6" />
    </div>
  );
};

export default CourseChangesFeedPage;
