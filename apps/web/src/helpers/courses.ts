import { Language, MinimalCourse, RawCourseID } from "@/types/courses";
import { createTimetableFromCourses } from "./timetable";
import { departments } from "@/const/departments";
import { classCode } from "@/const/class_code";

export const getGECType = (ge_type: string) => {
  //核心通識Core GE courses 1, 核心通識Core GE courses 2  <- return this number
  if (ge_type.includes("核心通識Core GE courses")) {
    return parseInt(ge_type.slice(-1));
  } else return null;
};

export const hasConflictingTimeslots = (courses: MinimalCourse[]) => {
  const timetableData = createTimetableFromCourses(courses);
  return timetableData.filter((timeslot, index, self) => {
    const otherTimeslots = self.filter((ts, i) => i != index);
    return (
      otherTimeslots.find(
        (ts) =>
          ts.dayOfWeek == timeslot.dayOfWeek &&
          ts.startTime <= timeslot.endTime &&
          ts.endTime >= timeslot.startTime,
      ) != undefined
    );
  });
};

//check if there is same dept same course but different class, return course codes
export const hasSameCourse = (courses: MinimalCourse[]) => {
  const sameCourse = courses.filter((course, index, self) => {
    const otherCourses = self.filter((c, i) => i != index);
    return (
      otherCourses.find(
        (c) => c.department == course.department && c.course == course.course,
      ) != undefined
    );
  });
  return sameCourse.map((course) => course.raw_id) as RawCourseID[];
};

export const getSemesterFromID = (id: string) => {
  return id.slice(0, 5) as RawCourseID;
};

export const hasTimes = (course: MinimalCourse) => {
  return course.times.length > 0 && !course.times.every((m) => m.trim() == "");
};

export const getScoreType = (score: string) => {
  // 'gpa' | 'percent'
  switch (score) {
    case "gpa":
      return "GPA";
    case "percent":
      return "百分制";
    default:
      return "GPA";
  }
};

// Define mappings for degree types and class letters
const degreeTypes: { [key: string]: any } = {
  zh: { B: "", M: "碩士班", D: "博士班", P: "專班" },
  en: { B: "", M: "Master", D: "Doctoral", P: "Special" },
};

const classLetters: { [key: string]: any } = {
  zh: { A: "清班", B: "華班", C: "梅班", D: "班" },
  en: { A: "Qing", B: "Hua", C: "Mei", D: "" },
};

export const checkValidClassCode = (class_code: string, semester: string) => {
  // Parse the input string
  const match = class_code.toUpperCase().match(/(^[^\d]+)(\d+)([BMD])([A-D]?)/);
  if (!match) {
    return class_code;
  }

  const sem = parseInt(semester.slice(0, 3));

  // Extract components
  const [, deptName, year, degreeType, classLetter] = match;

  //if degreetype = B and year - sem > 4, return false
  if (sem - parseInt(year) > 4) {
    return false;
  }
  return true;
};

export const getFormattedClassCode = (
  class_code: string,
  semester: string,
  lang: string,
) => {
  // Parse the input string
  const match = class_code
    .toUpperCase()
    .match(/(^[^\d]+)(\d+)([BMDP])([A-D]?)/);
  if (!match) {
    return class_code;
  }

  const sem = parseInt(semester.slice(0, 3));

  // Extract components
  const [, deptName, year, degreeType, classLetter] = match;

  // Translate components
  const yearNumber = sem - parseInt(year) + 1;
  const readableYear = lang === "zh" ? `${yearNumber}年級` : ` Y${yearNumber} `;

  const readableDegreeType = degreeTypes[lang][degreeType] || "";
  const readableClassLetter = classLetters[lang][classLetter] || "";

  const department = classCode.find((dept) => dept.code_zh === deptName);

  let deptCode;

  if (department?.code_zh == "NA") {
    deptCode = deptName;
  } else {
    // Select the department name based on the language
    deptCode = lang === "zh" ? department?.code_zh : department?.code;
  }

  // exception for EECS-GS
  if (deptName == "電資院學士班" && degreeType == "B" && classLetter == "A") {
    return lang === "zh"
      ? `電資院學士班${readableYear}國際學程`
      : `EECS-GS ${readableYear}`;
  }
  // Construct the output
  return `${deptName}${readableYear}${readableDegreeType}${readableClassLetter}`;
};
