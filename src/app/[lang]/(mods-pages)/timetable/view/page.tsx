"use client";
import Timetable from "@/components/Timetable/Timetable";
import { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import supabase from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { useMemo, useState } from "react";
import { lastSemester } from "@/const/semester";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

const ViewTimetablePage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentColors, setCourses, setColorMap } = useUserTimetable();
  const [semester, setSemester] = useState<string>(lastSemester.id);
  const colorMap = JSON.parse(
    decodeURIComponent(searchParams.get("colorMap") ?? "{}"),
  );

  const courseCodes = useMemo(() => {
    if (searchParams.size > 0) {
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

  if (!courseCodes) router.back();

  const {
    data: courses = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["courses", courseCodes![semester]],
    queryFn: async () => {
      const { data = [], error } = await supabase
        .from("courses")
        .select("*")
        .in("raw_id", courseCodes![semester]);
      if (error) throw error;
      if (!data) throw new Error("No data");
      return data;
    },
  });
  const timetableData = createTimetableFromCourses(
    courses as MinimalCourse[],
    colorMap,
  );

  const totalCredits = useMemo(() => {
    if (!courses) return 0;
    return courses.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
  }, [courses]);

  const handleImportCourses = () => {
    setCourses(courseCodes!);
    setColorMap(colorMap);
    router.push("/timetable");
  };

  const handleImportThisSemester = () => {
    setCourses((courses) => ({
      ...courses,
      [semester]: courseCodes![semester] ?? [],
    }));
    const partialColorMap: { [c: string]: string } = {};
    courseCodes![semester].forEach((code, index) => {
      partialColorMap[code] = currentColors[index];
    });
    setColorMap((colorMap) => ({ ...colorMap, ...partialColorMap }));
    router.push("/timetable");
  };

  return (
    <div className="flex flex-col w-full h-full">
      <SemesterSwitcher semester={semester} setSemester={setSemester} />
      <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
        <Timetable
          timetableData={timetableData}
          renderTimetableSlot={renderTimetableSlot}
        />
        <div className="flex flex-col gap-4 px-4">
          <Card>
            <CardHeader>
              <CardTitle>把課程導入這個裝置嗎？</CardTitle>
              <CardDescription>
                Importing courses will overwrite all your courses
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <div className="flex flex-row gap-4 justify-end">
                <Button onClick={handleImportThisSemester}>
                  Import this semester
                </Button>
                <Button onClick={handleImportCourses}>Import All</Button>
              </div>
            </CardFooter>
          </Card>

          {courses &&
            courses.map((course, index) => (
              <div key={index} className="flex flex-row gap-4 items-center">
                <div
                  className="w-4 h-4 rounded-full"
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
                          className="flex flex-row items-center space-x-2 font-mono text-gray-400"
                        >
                          <span className="text-xs">{venue}</span>
                          <span className="text-xs">{time}</span>
                        </div>
                      );
                    }) || (
                      <span className="text-gray-400 text-xs">No Venue</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          <Separator />
          <div className="flex flex-row gap-4 justify-end">
            <div className="space-x-2">
              <span className="font-bold">{courses.length}</span>
              <span className="text-gray-600">課</span>
            </div>
            <div className="space-x-2">
              <span className="font-bold">{totalCredits}</span>
              <span className="text-gray-600">總學分</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTimetablePage;
