import Timetable from "@/components/Timetable/Timetable";
import { Switch } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  createTimetableFromCourses,
  colorMapFromCourses,
} from "@/helpers/timetable";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
  RawCourseID,
  Semester,
  DepartmentCode,
  CourseCode,
  ClassCode,
  Credits,
  Venue,
  Time,
  TeacherZH,
  TeacherEN,
  Language,
} from "@/types/courses";
import { useState } from "react";

// raw_id: RawCourseID;
// name_zh: string;
// name_en: string;
// semester: Semester;
// department: DepartmentCode;
// course: CourseCode;
// class: ClassCode;
// credits: Credits;
// venues: Venue[];
// times: Time[];
// teacher_zh: TeacherZH[];
// teacher_en: TeacherEN[];
// language: Language;

const TimetablePreview = () => {
  const { currentColors } = useUserTimetable();
  const dict = useDictionary();

  const sampleCourses = createTimetableFromCourses(
    [
      {
        raw_id: "22210ABCD123402",
        name_zh: "惡夢的課程",
        name_en: "Nightmare Course",
        semester: "110-1",
        department: "CS",
        course: "1234",
        class: "02",
        credits: 3,
        venues: ["夢中321"],
        times: ["M1M2"],
        teacher_zh: ["王小明"],
        teacher_en: ["Wang, Xiao-Ming"],
        language: "英",
      },
      {
        raw_id: "22210ABCD123403",
        name_zh: "微積分",
        name_en: "Calculus",
        semester: "110-1",
        department: "MA",
        course: "1234",
        class: "03",
        credits: 3,
        venues: ["數學101"],
        times: ["T3T4"],
        teacher_zh: ["王大明"],
        teacher_en: ["Wang, Da-Ming"],
        language: "中",
      },
      {
        raw_id: "22210ABCD123401",
        name_zh: "程式設計",
        name_en: "Programming",
        semester: "110-1",
        department: "CS",
        course: "1234",
        class: "01",
        credits: 3,
        venues: ["資訊101"],
        times: ["W1W2W3"],
        teacher_zh: ["王大明"],
        teacher_en: ["Wang, Da-Ming"],
        language: "中",
      },
    ],
    colorMapFromCourses(
      ["22210ABCD123402", "22210ABCD123403", "22210ABCD123401"],
      currentColors,
    ),
  );

  const [vertical, setVertical] = useState(true);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative max-h-[320px] overflow-hidden">
        <Timetable timetableData={sampleCourses} vertical={vertical} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent"
        />
      </div>
      <div className="flex w-full flex-row items-center gap-4 py-2">
        <span className="flex-1 text-sm font-bold">
          {dict.settings.timetable.vertical_preview}
        </span>
        <Switch checked={vertical} onCheckedChange={setVertical} />
      </div>
    </div>
  );
};

export default TimetablePreview;
