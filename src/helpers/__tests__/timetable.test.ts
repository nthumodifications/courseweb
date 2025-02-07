import { createTimetableFromCourses } from "../timetable";
import { MinimalCourse } from "@/types/courses";
import { timetableColors } from "@/const/timetableColors";

describe("createTimetableFromCourses", () => {
  it("should return an empty array when no courses are provided", () => {
    const courses: MinimalCourse[] = [];
    const result = createTimetableFromCourses(courses);
    expect(result).toEqual([]);
  });

  const sampleCourse: MinimalCourse = {
    // 1 Session, Same Day
    raw_id: "11310EECS123402",
    class: "02",
    course: "1234",
    credits: 3,
    department: "EECS",
    language: "英",
    name_en: "Introduction to Computer Science",
    name_zh: "計算機概論",
    semester: "11310",
    times: ["W3W4"],
    venues: ["Room 202"],
    teacher_en: ["Jane Doe"],
    teacher_zh: ["杜蘭"],
  };

  it("should create timetable entries for courses with valid times", () => {
    const courses: MinimalCourse[] = [
      {
        // 1 Session, Same Day
        ...sampleCourse,
        times: ["W3W4"],
        venues: ["Room 202"],
      },
      {
        // 2 Sessions, Different Days
        ...sampleCourse,
        times: ["M1M2W3W4"],
        venues: ["Room 101"],
      },
      {
        // 2 Sessions, Same Day
        ...sampleCourse,
        times: ["M1M2MaMb"],
        venues: ["Room 303"],
      },
      {
        // 3 Sessions, Different Days
        ...sampleCourse,
        times: ["M1M2W3W4F5"],
        venues: ["Room 404"],
      },
      {
        // 2 Sessions, Different Days, Different venues
        ...sampleCourse,
        times: ["M1M2W3W4"],
        venues: ["Room 101", "Room 202"],
      },
      {
        // 2 Sessions, Same Day, Different venues
        ...sampleCourse,
        times: ["M1M2MaMb"],
        venues: ["Room 303", "Room 404"],
      },
    ];
    const colorMap = {
      "11310EECS123402": "#FF5733",
    };
    const result = createTimetableFromCourses(courses, colorMap);
    expect(result).toHaveLength(12);
    expect(result).toMatchObject([
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["W3W4"],
          venues: ["Room 202"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 202",
        dayOfWeek: 2,
        startTime: 2,
        endTime: 3,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4"],
          venues: ["Room 101"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 101",
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4"],
          venues: ["Room 101"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 101",
        dayOfWeek: 2,
        startTime: 2,
        endTime: 3,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2MaMb"],
          venues: ["Room 303"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 303",
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2MaMb"],
          venues: ["Room 303"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 303",
        dayOfWeek: 0,
        startTime: 10,
        endTime: 11,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4F5"],
          venues: ["Room 404"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 404",
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4F5"],
          venues: ["Room 404"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 404",
        dayOfWeek: 2,
        startTime: 2,
        endTime: 3,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4F5"],
          venues: ["Room 404"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 404",
        dayOfWeek: 4,
        startTime: 5,
        endTime: 5,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4"],
          venues: ["Room 101", "Room 202"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 101",
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2W3W4"],
          venues: ["Room 101", "Room 202"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 101",
        dayOfWeek: 2,
        startTime: 2,
        endTime: 3,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2MaMb"],
          venues: ["Room 303", "Room 404"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 303",
        dayOfWeek: 0,
        startTime: 0,
        endTime: 1,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
      {
        course: {
          raw_id: "11310EECS123402",
          class: "02",
          course: "1234",
          credits: 3,
          department: "EECS",
          language: "英",
          name_en: "Introduction to Computer Science",
          name_zh: "計算機概論",
          semester: "11310",
          times: ["M1M2MaMb"],
          venues: ["Room 303", "Room 404"],
          teacher_en: ["Jane Doe"],
          teacher_zh: ["杜蘭"],
        },
        venue: "Room 303",
        dayOfWeek: 0,
        startTime: 10,
        endTime: 11,
        color: "#FF5733",
        textColor: "#ffeae5",
      },
    ]);
  });

  it("should handle courses without times gracefully", () => {
    const courses: MinimalCourse[] = [
      {
        ...sampleCourse,
        times: [],
        venues: [],
      },
    ];
    const result = createTimetableFromCourses(courses);
    expect(result).toEqual([]);
  });

  it("should assign default color when colorMap does not contain the course id", () => {
    const courses: MinimalCourse[] = [
      {
        ...sampleCourse,
        times: ["W3W4"],
        venues: ["Room 202"],
      },
    ];
    const result = createTimetableFromCourses(courses);
    // should be first color of default timetable colors
    expect(result[0].color).toBe(
      timetableColors[Object.keys(timetableColors)[0]][0],
    );
  });
});
