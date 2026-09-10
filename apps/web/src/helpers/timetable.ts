import { scheduleTimeSlots, timetableColors } from "@courseweb/shared";
import { CourseTimeslotData, CustomTimetableItem } from "@/types/timetable";
import { MinimalCourse } from "@/types/courses";
import { getBrightness, getContrastColor } from "./colors";
import { hasTimes } from "./courses";

export const createTimetableFromCourses = (
  data: MinimalCourse[],
  colorMap: { [courseId: string]: string } = colorMapFromCourses(
    data.map((i) => i.raw_id),
    timetableColors[Object.keys(timetableColors)[0]],
  ),
) => {
  const newTimetableData: CourseTimeslotData[] = [];

  // For each course, we first seperate the timeslot strings into individual timeslots
  // Then we group consecutive timeslots into a single item
  data!.forEach((course) => {
    if (!hasTimes(course)) {
      return;
    }
    course.times.forEach((time_str, index) => {
      // Split the timeslot string into individual timeslots
      const timeslots = time_str
        .match(/.{1,2}/g)
        ?.map((day) => ({ day: day[0], time: day[1] })); // Day is "MTWRFS" and time is "123456789abcd"

      // Group consecutive timeslots by reducing the array
      // 1. get first timeslot, check if next consecutive timeslot is present
      // 2. if present, group them together
      // 3. if not present, push the group to the groupedTimeslots array
      const groupedTimeslots: { day: string; time: string }[][] = [];
      timeslots!.reduce((acc, curr) => {
        if (acc.length === 0) {
          acc.push([curr]);
        } else {
          const last = acc[acc.length - 1];
          const lastTime = last[last.length - 1];
          const lastTimeIndex = scheduleTimeSlots
            .map((m) => m.time)
            .indexOf(lastTime.time);
          const currTimeIndex = scheduleTimeSlots
            .map((m) => m.time)
            .indexOf(curr.time);
          // if timeslots are consecutive and on the same day
          if (
            lastTimeIndex + 1 === currTimeIndex &&
            lastTime.day === curr.day
          ) {
            last.push(curr);
          }
          // else, push to new group
          else {
            acc.push([curr]);
          }
        }
        return acc;
      }, groupedTimeslots);

      groupedTimeslots.forEach((group) => {
        const day = group[0].day;
        const times = group.map((time) =>
          scheduleTimeSlots.map((m) => m.time).indexOf(time.time),
        );

        //get the start and end time
        const startTime = Math.min(...times);
        const endTime = Math.max(...times);
        //get the color, mod the index by the length of the color array so that it loops
        const color = colorMap[course.raw_id] || "#555555";

        // Use the WCAG-compliant contrast function for better text legibility
        const textColor = getContrastColor(color);

        //push to scheduleData
        newTimetableData.push({
          course: course,
          venue: course.venues![index]!,
          dayOfWeek: "MTWRFS".indexOf(day),
          startTime: startTime,
          endTime: endTime,
          color: color,
          textColor: textColor,
        });
      });
    });
  });
  return newTimetableData;
};

export const colorMapFromCourses = (courseIds: string[], colors?: string[]) => {
  const colorMap: { [id: string]: string } = {};
  const safeColors = colors ?? timetableColors[Object.keys(timetableColors)[0]];
  courseIds.forEach((id, index) => {
    colorMap[id] = safeColors[index % safeColors.length];
  });
  return colorMap;
};

const customItemAsCourse = (item: CustomTimetableItem) =>
  ({
    raw_id: `custom-${item.id}`,
    name_zh: item.title,
    name_en: item.title,
    department: "CUSTOM",
    course: item.shortCode ?? "",
    class: "",
    credits: 0,
    venues: item.venue ? [item.venue] : [],
    times: item.schedule,
    teacher_zh: [],
    teacher_en: [],
  }) as unknown as MinimalCourse;

export const createTimetableFromCustomItems = (
  items: CustomTimetableItem[],
): CourseTimeslotData[] => {
  const timetableData: CourseTimeslotData[] = [];

  items.forEach((item) => {
    const customCourse = customItemAsCourse(item);
    item.schedule.forEach((timeString) => {
      const timeslots = timeString
        .match(/.{1,2}/g)
        ?.map((slot) => ({ day: slot[0], time: slot[1] }))
        .filter(
          (slot) =>
            "MTWRFS".includes(slot.day) &&
            scheduleTimeSlots.some((period) => period.time === slot.time),
        );

      if (!timeslots?.length) return;

      const groupedTimeslots: { day: string; time: string }[][] = [];
      timeslots.forEach((current) => {
        const previousGroup = groupedTimeslots[groupedTimeslots.length - 1];
        const previous = previousGroup?.[previousGroup.length - 1];
        const previousIndex = previous
          ? scheduleTimeSlots.findIndex(
              (period) => period.time === previous.time,
            )
          : -1;
        const currentIndex = scheduleTimeSlots.findIndex(
          (period) => period.time === current.time,
        );

        if (
          previousGroup &&
          previous?.day === current.day &&
          previousIndex + 1 === currentIndex
        ) {
          previousGroup.push(current);
        } else {
          groupedTimeslots.push([current]);
        }
      });

      groupedTimeslots.forEach((group) => {
        const day = group[0].day;
        const periodIndexes = group.map((slot) =>
          scheduleTimeSlots.findIndex((period) => period.time === slot.time),
        );
        const color = item.color || "#555555";
        timetableData.push({
          course: customCourse,
          customItem: item,
          venue: item.venue ?? "",
          dayOfWeek: "MTWRFS".indexOf(day),
          startTime: Math.min(...periodIndexes),
          endTime: Math.max(...periodIndexes),
          color,
          textColor: getContrastColor(color),
        });
      });
    });
  });

  return timetableData;
};

export const createTimetableFromCoursesAndCustomItems = (
  courses: MinimalCourse[],
  customItems: CustomTimetableItem[],
  colorMap: { [courseId: string]: string } = colorMapFromCourses(
    courses.map((course) => course.raw_id),
    timetableColors[Object.keys(timetableColors)[0]],
  ),
) => [
  ...createTimetableFromCourses(courses, colorMap),
  ...createTimetableFromCustomItems(customItems),
];
