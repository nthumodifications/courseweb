import Timetable from "@/components/Timetable/Timetable";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createTimetableFromCoursesAndCustomItems } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { CustomTimetableStorageInput } from "@/types/timetable";
import { normalizeCustomTimetableStorage } from "@/hooks/syncedStorage";
import { useMemo, useState } from "react";
import { lastSemester } from "@courseweb/shared";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
} from "@courseweb/ui";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { decodeTimetableShareQuery } from "@/helpers/timetableShare";
import { mergeTimetableImport } from "@/helpers/timetableImport";
import { toPrettySemester } from "@/helpers/semester";
import {
  calculateTimetableImportDiff,
  decodeCcXpImportQuery,
  getCcXpImportRows,
  getCcXpCourseLookupIds,
  isCcXpImportReady,
  normalizeCcxpCourseId,
  type DecodedCcXpImportQuery,
} from "@/helpers/ccxpImport";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";

const ViewTimetablePage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const routeLang = lang === "en" || lang === "zh-cn" ? lang : "zh";
  const [searchParams] = useSearchParams();
  const {
    currentColors,
    setCourses,
    setColorMap,
    setCustomItems,
    courses: savedCourses,
    timetableDataReady,
    customItemsDataReady,
  } = useUserTimetable();
  const dict = useDictionary();
  const localizeData = useLocalizedZhData();
  const isCcXpImport = searchParams.get("source") === "ccxp";
  const decodedShare = useMemo(
    () =>
      isCcXpImport
        ? decodeCcXpImportQuery(searchParams)
        : decodeTimetableShareQuery(searchParams),
    [isCcXpImport, searchParams],
  );
  const [semester, setSemester] = useState<string>(
    decodedShare?.initialSemester ?? lastSemester.id,
  );
  const colorMap = decodedShare?.colorMap ?? {};
  const sharedCustomItems = useMemo<CustomTimetableStorageInput>(() => {
    const value = searchParams.get("customItems");
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [searchParams]);

  const courseCodes = decodedShare?.courseCodes;
  const ccxpDecoded = isCcXpImport
    ? (decodedShare as DecodedCcXpImportQuery | null)
    : null;
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);

  if (!courseCodes) {
    navigate(-1);
    return null;
  }

  const requestedCourseIds = courseCodes[semester] ?? [];
  const timetableStateReady = timetableDataReady && customItemsDataReady;
  const currentSemesterCourseIds = timetableStateReady
    ? (savedCourses[semester] ?? [])
    : [];
  const courseLookupIds = isCcXpImport
    ? [
        ...new Set([
          ...requestedCourseIds.flatMap(getCcXpCourseLookupIds),
          ...currentSemesterCourseIds.flatMap(getCcXpCourseLookupIds),
        ]),
      ]
    : requestedCourseIds;
  const {
    data: courses = [],
    error: courseQueryError,
    isLoading: coursesLoading,
  } = useQuery({
    queryKey: ["courses", courseLookupIds],
    queryFn: async () => {
      const res = await client.course.$get({
        query: { courses: courseLookupIds },
      });

      const data = await res.json();
      if (!data) throw new Error("No data");
      return data as MinimalCourse[];
    },
    enabled: isCcXpImport
      ? Boolean(courseLookupIds.length)
      : Boolean(courseCodes?.[semester]),
  });
  const resolvedCourseByCanonicalId = useMemo(() => {
    const resolved = new Map<string, MinimalCourse>();
    courses.forEach((course) => {
      const normalized = normalizeCcxpCourseId(course.raw_id);
      if (normalized) resolved.set(normalized, course);
    });
    return resolved;
  }, [courses]);
  const importedCourseIds = isCcXpImport
    ? requestedCourseIds
        .map((id) => resolvedCourseByCanonicalId.get(id)?.raw_id)
        .filter((id): id is string => Boolean(id))
    : requestedCourseIds;
  const previewCourses = isCcXpImport
    ? requestedCourseIds
        .map((id) => resolvedCourseByCanonicalId.get(id))
        .filter((course): course is MinimalCourse => Boolean(course))
    : courses;
  const unknownCourseIds = isCcXpImport
    ? [
        ...(ccxpDecoded?.unknownCourseIds[semester] ?? []),
        ...(coursesLoading || courseQueryError
          ? []
          : requestedCourseIds
              .filter((id) => !resolvedCourseByCanonicalId.has(id))
              .map((id) => ({ id, reason: "unknown" as const }))),
      ]
    : [];
  const ccxpSummaryReady =
    timetableStateReady && !coursesLoading && !courseQueryError;
  const ccxpMergeDiff = ccxpSummaryReady
    ? calculateTimetableImportDiff(
        currentSemesterCourseIds,
        importedCourseIds,
        "merge",
      )
    : null;
  const ccxpReplaceDiff = ccxpSummaryReady
    ? calculateTimetableImportDiff(
        currentSemesterCourseIds,
        importedCourseIds,
        "replace",
      )
    : null;
  const ccxpImportRows = ccxpSummaryReady
    ? getCcXpImportRows(currentSemesterCourseIds, importedCourseIds, courses)
    : [];
  const ccxpActionsReady = isCcXpImportReady({
    coursesLoading,
    hasCourseQueryError: Boolean(courseQueryError),
    importedCourseCount: importedCourseIds.length,
    timetableDataReady,
    customItemsDataReady,
  });
  const timetableData = createTimetableFromCoursesAndCustomItems(
    previewCourses,
    sharedCustomItems[semester] ?? [],
    colorMap,
  );

  const handleImportCourses = () => {
    const sharedTimetable = {
      courses: courseCodes!,
      customItems: normalizeCustomTimetableStorage(sharedCustomItems),
      colorMap,
    };
    setCourses(
      (courses) =>
        mergeTimetableImport(
          { courses, customItems: {}, colorMap: {} },
          sharedTimetable,
        ).courses,
    );
    setColorMap(
      (colorMap) =>
        mergeTimetableImport(
          { courses: {}, customItems: {}, colorMap },
          sharedTimetable,
        ).colorMap,
    );
    setCustomItems(
      (customItems) =>
        mergeTimetableImport(
          { courses: {}, customItems, colorMap: {} },
          sharedTimetable,
        ).customItems,
    );
    navigate(`/${routeLang}/timetable`);
  };

  const importThisSemester = (courseIds: string[]) => {
    setCourses((courses) => ({
      ...courses,
      [semester]: courseIds,
    }));
    setCustomItems((items) => ({
      ...items,
      [semester]:
        normalizeCustomTimetableStorage({
          [semester]: sharedCustomItems[semester] ?? [],
        })[semester] ?? [],
    }));
    const partialColorMap: { [c: string]: string } = {};
    courseIds.forEach((code, index) => {
      partialColorMap[code] = currentColors[index];
    });
    setColorMap((colorMap) => ({ ...colorMap, ...partialColorMap }));
  };

  const handleImportThisSemester = () => {
    importThisSemester(courseCodes![semester] ?? []);
    navigate(`/${routeLang}/timetable`);
  };

  const handleCcXpImport = (mode: "merge" | "replace") => {
    if (mode === "replace") {
      importThisSemester(importedCourseIds);
    } else {
      setCourses(
        (courses) =>
          mergeTimetableImport(
            { courses, customItems: {}, colorMap: {} },
            {
              courses: { [semester]: importedCourseIds },
              customItems: {},
              colorMap: {},
            },
            { courseMode: "merge", preserveCustomItems: true },
          ).courses,
      );
      setColorMap((colorMap) => {
        const nextColorMap = { ...colorMap };
        importedCourseIds.forEach((courseId, index) => {
          if (!nextColorMap[courseId]) {
            nextColorMap[courseId] =
              currentColors[
                (currentSemesterCourseIds.length + index) % currentColors.length
              ];
          }
        });
        return nextColorMap;
      });
    }
    navigate(`/${routeLang}/timetable`);
  };

  const handleCcXpReplaceRequest = () => {
    if (!ccxpReplaceDiff) return;
    if (ccxpReplaceDiff.removed.length === 0) {
      handleCcXpImport("replace");
      return;
    }
    setReplaceDialogOpen(true);
  };

  const renderCourseList = (courseList: MinimalCourse[]) => (
    <>
      {courseList.map((course) => (
        <div key={course.raw_id} className="flex flex-row gap-4 items-center">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: colorMap[course.raw_id] }}
          ></div>
          <div className="flex flex-col flex-1">
            <span className="text-sm">{localizeData(course.name_zh)}</span>
            <span className="text-xs">{course.name_en}</span>
            <div className="mt-1">
              {course.venues?.map((venue, index) => {
                const time = course.times![index];
                return (
                  <div
                    key={index}
                    className="flex flex-row items-center space-x-2 font-mono text-gray-400"
                  >
                    <span className="text-xs">{localizeData(venue)}</span>
                    <span className="text-xs">{time}</span>
                  </div>
                );
              }) || (
                <span className="text-gray-400 text-xs">
                  {dict.timetable.view.no_venue}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      <Separator />
      <div className="flex flex-row gap-4 justify-end">
        <div className="space-x-2">
          <span className="font-bold">{courseList.length}</span>
          <span className="text-gray-600">
            {dict.timetable.view.courses_unit}
          </span>
        </div>
        <div className="space-x-2">
          <span className="font-bold">
            {courseList.reduce((acc, course) => acc + (course.credits ?? 0), 0)}
          </span>
          <span className="text-gray-600">
            {dict.timetable.view.total_credits}
          </span>
        </div>
      </div>
    </>
  );

  const ccxpUnknownOverflow =
    ccxpDecoded?.unknownCourseIdOverflow[semester] ?? 0;
  const hasCcXpUnknownCourses =
    unknownCourseIds.length > 0 || ccxpUnknownOverflow > 0;

  return (
    <div
      className={`flex flex-col w-full h-full${isCcXpImport ? " px-4" : ""}`}
    >
      <SemesterSwitcher semester={semester} setSemester={setSemester} />
      {isCcXpImport ? (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
            {courseQueryError ? (
              <p className="text-sm text-destructive">
                {dict.timetable.view.ccxp_load_error}
              </p>
            ) : !ccxpSummaryReady ? (
              <p className="text-sm text-muted-foreground">
                {dict.timetable.view.ccxp_syncing}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {dict.timetable.view.ccxp_summary
                  .replace("{semester}", toPrettySemester(semester))
                  .replace("{added}", String(ccxpMergeDiff?.added.length ?? 0))
                  .replace(
                    "{already}",
                    String(ccxpMergeDiff?.alreadyPresent.length ?? 0),
                  )}
              </p>
            )}
            <div className="flex w-full gap-2 md:w-auto">
              <Button
                className="min-h-10 flex-1 md:flex-none"
                disabled={!ccxpActionsReady}
                onClick={() => handleCcXpImport("merge")}
              >
                {dict.timetable.view.ccxp_merge}
              </Button>
              <Button
                className="min-h-10 flex-1 md:flex-none"
                variant="outline"
                disabled={!ccxpActionsReady}
                onClick={handleCcXpReplaceRequest}
              >
                {dict.timetable.view.ccxp_replace}
              </Button>
            </div>
            <AlertDialog
              open={replaceDialogOpen}
              onOpenChange={setReplaceDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {dict.timetable.view.ccxp_replace_title}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {dict.timetable.view.ccxp_replace_description.replace(
                      "{count}",
                      String(ccxpReplaceDiff?.removed.length ?? 0),
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleCcXpImport("replace")}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {dict.timetable.view.ccxp_replace_confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {ccxpSummaryReady && (
            <div className="flex flex-col divide-y divide-border">
              {ccxpImportRows.map((row) => {
                const course = row.course;
                const courseName = course
                  ? routeLang === "en"
                    ? course.name_en
                    : localizeData(course.name_zh)
                  : row.id;
                const courseNumber = course
                  ? `${course.department} ${course.course}${course.class.padStart(2, "0")}`
                  : row.id;
                const courseSchedule = course
                  ? course.times.length > 0
                    ? course.times
                        .map((time, index) => {
                          const venue = course.venues[index]
                            ? localizeData(course.venues[index])
                            : dict.timetable.view.no_venue;
                          return `${time} ${venue}`;
                        })
                        .join("・")
                    : dict.timetable.view.no_venue
                  : row.id;
                const statusLabel =
                  row.status === "new"
                    ? dict.timetable.view.ccxp_status_new
                    : row.status === "already"
                      ? dict.timetable.view.ccxp_status_already
                      : dict.timetable.view.ccxp_status_removed;
                return (
                  <div
                    key={`${row.status}-${row.id}`}
                    className="flex min-w-0 flex-row gap-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{courseName}</div>
                      <div className="text-sm text-muted-foreground">
                        {courseNumber}・{courseSchedule}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-right font-bold whitespace-nowrap${row.status === "new" ? "" : " text-muted-foreground"}`}
                    >
                      {statusLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasCcXpUnknownCourses && (
            <div className="mt-6">
              <h2 className="text-sm font-medium">
                {dict.timetable.view.ccxp_unknown_title}
              </h2>
              <div className="flex flex-col divide-y divide-border">
                {unknownCourseIds.map(({ id, reason }) => (
                  <div
                    key={`${id}-${reason}`}
                    className="flex flex-row gap-4 py-4 opacity-30"
                  >
                    <code className="min-w-0 flex-1">{id}</code>
                    <span className="shrink-0 text-right text-sm text-muted-foreground">
                      {dict.timetable.view.ccxp_unknown_reasons[reason]}
                    </span>
                  </div>
                ))}
                {ccxpUnknownOverflow > 0 && (
                  <div className="py-4 text-sm text-muted-foreground opacity-30">
                    {dict.timetable.view.ccxp_unknown_more.replace(
                      "{count}",
                      String(ccxpUnknownOverflow),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4">
            <Timetable
              timetableData={timetableData}
              renderTimetableSlot={renderTimetableSlot}
            />
            {renderCourseList(previewCourses)}
          </div>
          <div className="h-6" />
        </div>
      ) : (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
          <div className="flex min-w-0 flex-col gap-4">
            <Timetable
              timetableData={timetableData}
              renderTimetableSlot={renderTimetableSlot}
            />
          </div>
          <div className="flex flex-col gap-4 px-4">
            <Card>
              <CardHeader>
                <CardTitle>{dict.timetable.view.import_title}</CardTitle>
                <CardDescription>
                  {dict.timetable.view.import_description}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <div className="flex flex-row gap-4 justify-end">
                  <Button onClick={handleImportThisSemester}>
                    {dict.timetable.view.import_semester}
                  </Button>
                  <Button onClick={handleImportCourses}>
                    {dict.timetable.view.import_all}
                  </Button>
                </div>
              </CardFooter>
            </Card>
            {renderCourseList(courses)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTimetablePage;
