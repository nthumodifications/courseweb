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
  CardContent,
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
import {
  calculateTimetableImportDiff,
  decodeCcXpImportQuery,
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
  const courseLookupIds = isCcXpImport
    ? requestedCourseIds.flatMap(getCcXpCourseLookupIds)
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
  const timetableStateReady = timetableDataReady && customItemsDataReady;
  const ccxpSummaryReady =
    timetableStateReady && !coursesLoading && !courseQueryError;
  const currentSemesterCourseIds = timetableStateReady
    ? savedCourses[semester] ?? []
    : [];
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
  const ccxpActionsReady = isCcXpImportReady({
    coursesLoading,
    hasCourseQueryError: Boolean(courseQueryError),
    importedCourseCount: importedCourseIds.length,
    timetableDataReady,
    customItemsDataReady,
  });
  const timetableData = createTimetableFromCoursesAndCustomItems(
    courses,
    sharedCustomItems[semester] ?? [],
    colorMap,
  );

  const totalCredits = useMemo(() => {
    if (!courses) return 0;
    return courses.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
  }, [courses]);

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

  return (
    <div className="flex flex-col w-full h-full">
      <SemesterSwitcher semester={semester} setSemester={setSemester} />
      <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
        <div className="flex min-w-0 flex-col gap-4">
          <Timetable
            timetableData={timetableData}
            renderTimetableSlot={renderTimetableSlot}
          />
        </div>
        <div className="flex flex-col gap-4 px-4">
          <Card>
            {isCcXpImport ? (
              <>
                <CardHeader>
                  <CardTitle>{dict.timetable.view.ccxp_title}</CardTitle>
                  <CardDescription>
                    {dict.timetable.view.ccxp_description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courseQueryError ? (
                    <p className="text-sm text-destructive">
                      {dict.timetable.view.ccxp_load_error}
                    </p>
                  ) : !ccxpSummaryReady ? (
                    <p className="text-sm text-muted-foreground">
                      {dict.timetable.view.ccxp_syncing}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {ccxpMergeDiff?.added.length}
                        </span>
                        <span className="text-muted-foreground">
                          {dict.timetable.view.ccxp_added}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {ccxpMergeDiff?.alreadyPresent.length}
                        </span>
                        <span className="text-muted-foreground">
                          {dict.timetable.view.ccxp_already_present}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {ccxpReplaceDiff?.removed.length}
                        </span>
                        <span className="text-muted-foreground">
                          {dict.timetable.view.ccxp_removed}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      disabled={!ccxpActionsReady}
                      onClick={() => handleCcXpImport("merge")}
                    >
                      {dict.timetable.view.ccxp_merge}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!ccxpActionsReady}
                      onClick={handleCcXpReplaceRequest}
                    >
                      {dict.timetable.view.ccxp_replace}
                    </Button>
                  </div>
                </CardFooter>
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
                      <AlertDialogCancel>
                        {dict.common.cancel}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleCcXpImport("replace")}
                        className="bg-destructive text-destructive-foreground"
                      >
                        {dict.timetable.view.ccxp_replace_confirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
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
              </>
            )}
          </Card>

          {isCcXpImport &&
            (unknownCourseIds.length > 0 ||
              (ccxpDecoded?.unknownCourseIdOverflow[semester] ?? 0) > 0) && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-bold">
                {dict.timetable.view.ccxp_unknown_title}
              </span>
              <ul className="list-disc pl-4 text-muted-foreground">
                {unknownCourseIds.map(({ id, reason }) => (
                  <li key={`${id}-${reason}`}>
                    <code>{id}</code> —{" "}
                    {dict.timetable.view.ccxp_unknown_reasons[reason]}
                  </li>
                ))}
                {(ccxpDecoded?.unknownCourseIdOverflow[semester] ?? 0) > 0 && (
                  <li>
                    {dict.timetable.view.ccxp_unknown_more.replace(
                      "{count}",
                      String(ccxpDecoded?.unknownCourseIdOverflow[semester]),
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}

          {courses &&
            courses.map((course) => (
              <div
                key={course.raw_id}
                className="flex flex-row gap-4 items-center"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorMap[course.raw_id] }}
                ></div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">
                    {localizeData(course.name_zh)}
                  </span>
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
              <span className="font-bold">{courses.length}</span>
              <span className="text-gray-600">
                {dict.timetable.view.courses_unit}
              </span>
            </div>
            <div className="space-x-2">
              <span className="font-bold">{totalCredits}</span>
              <span className="text-gray-600">
                {dict.timetable.view.total_credits}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTimetablePage;
