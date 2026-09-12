import Timetable from "@/components/Timetable/Timetable";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import supabase from "@/config/supabase";
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
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@courseweb/ui";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { PageShell } from "@courseweb/ui";

const ViewTimetablePage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const routeLang = lang === "en" ? "en" : "zh";
  const [searchParams] = useSearchParams();
  const { currentColors, setCourses, setColorMap, setCustomItems } =
    useUserTimetable();
  const dict = useDictionary();
  const [semester, setSemester] = useState<string>(lastSemester.id);
  const colorMap = JSON.parse(
    decodeURIComponent(searchParams.get("colorMap") ?? "{}"),
  );
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

  const courseCodes = useMemo(() => {
    if (searchParams.toString().length > 0) {
      //get all entries with the key 'semester_{semesterId}'
      const courseCodes: { [sem: string]: string[] } = {};
      searchParams.forEach((value, key) => {
        if (key.startsWith("semester_")) {
          courseCodes[key.replace("semester_", "")] = value
            .split(",")
            .map(decodeURI);
        }
      });
      return courseCodes;
    }
  }, [searchParams]);

  if (!courseCodes) {
    navigate(-1);
    return null;
  }

  const {
    data: courses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["courses", courseCodes![semester]],
    queryFn: async () => {
      const res = await client.course.$get({
        query: { courses: courseCodes![semester] },
      });

      const data = await res.json();
      if (!data) throw new Error("No data");
      return data;
    },
  });
  const timetableData = createTimetableFromCoursesAndCustomItems(
    courses as MinimalCourse[],
    sharedCustomItems[semester] ?? [],
    colorMap,
  );

  const totalCredits = useMemo(() => {
    if (!courses) return 0;
    return courses.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
  }, [courses]);

  const handleImportCourses = () => {
    setCourses(courseCodes!);
    setColorMap(colorMap);
    setCustomItems(normalizeCustomTimetableStorage(sharedCustomItems));
    navigate(`/${routeLang}/timetable`);
  };

  const handleImportThisSemester = () => {
    setCourses((courses) => ({
      ...courses,
      [semester]: courseCodes![semester] ?? [],
    }));
    setCustomItems((items) => ({
      ...items,
      [semester]:
        normalizeCustomTimetableStorage({
          [semester]: sharedCustomItems[semester] ?? [],
        })[semester] ?? [],
    }));
    const partialColorMap: { [c: string]: string } = {};
    courseCodes![semester].forEach((code, index) => {
      partialColorMap[code] = currentColors[index];
    });
    setColorMap((colorMap) => ({ ...colorMap, ...partialColorMap }));
    navigate(`/${routeLang}/timetable`);
  };

  return (
    <PageShell width="full" gap={false} className="min-h-0">
      <div className="flex min-h-0 h-full w-full flex-col">
        <SemesterSwitcher semester={semester} setSemester={setSemester} />
        <div className="grid min-w-0 grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden">
              <Timetable
                timetableData={timetableData}
                renderTimetableSlot={renderTimetableSlot}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
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

            {courses &&
              courses.map((course, index) => (
                <div key={index} className="flex flex-row gap-4 items-center">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: colorMap[course.raw_id] }}
                  ></div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm">{course.name_zh}</span>
                    <span className="text-xs">{course.name_en}</span>
                    <div className="mt-1">
                      {course.venues?.map((venue, index) => {
                        const time = course.times![index];
                        return (
                          <div
                            key={index}
                            className="flex flex-row items-center space-x-2 font-mono text-muted-foreground"
                          >
                            <span className="text-xs">{venue}</span>
                            <span className="text-xs">{time}</span>
                          </div>
                        );
                      }) || (
                        <span className="text-muted-foreground text-xs">
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
                <span className="text-muted-foreground">
                  {dict.timetable.view.courses_unit}
                </span>
              </div>
              <div className="space-x-2">
                <span className="font-bold">{totalCredits}</span>
                <span className="text-muted-foreground">
                  {dict.timetable.view.total_credits}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ViewTimetablePage;
