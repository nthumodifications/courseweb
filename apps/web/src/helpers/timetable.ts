import { scheduleTimeSlots, timetableColors } from "@courseweb/shared";
import {
  CourseTimeslotData,
  CustomTimetableItem,
  CustomTimetableItemInput,
  CustomTimetableSlot,
} from "@/types/timetable";
import { MinimalCourse } from "@/types/courses";
import { getContrastColor } from "./colors";
import { hasTimes } from "./courses";
import { normalizeCustomTimetableItem } from "@/hooks/syncedStorage";

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const timetableGridStart = timeToMinutes(scheduleTimeSlots[0]!.start);
export const timetableGridEnd = timeToMinutes(
  scheduleTimeSlots[scheduleTimeSlots.length - 1]!.end,
);

export type CustomTimetableSlotClassification = "grid" | "off-grid";

/**
 * A custom slot belongs to the grid only when its complete interval fits
 * inside the timetable's displayed clock range. Boundary-touching slots fit.
 */
export const classifyCustomTimetableSlot = (
  slot: CustomTimetableSlot,
  gridStart = timetableGridStart,
  gridEnd = timetableGridEnd,
): CustomTimetableSlotClassification => {
  const { start, end } = getCustomSlotTimeRange(slot);
  return start >= gridStart && end <= gridEnd ? "grid" : "off-grid";
};

export const isTimetableGridSlot = (slot: CourseTimeslotData) =>
  !slot.customSlot || classifyCustomTimetableSlot(slot.customSlot) === "grid";

export const getOffGridTimetableData = (data: CourseTimeslotData[]) =>
  data.filter(
    (slot) =>
      slot.customSlot &&
      classifyCustomTimetableSlot(slot.customSlot) === "off-grid",
  );

export const getCustomSlotTimeRange = (slot: CustomTimetableSlot) => ({
  start: timeToMinutes(slot.start),
  end: timeToMinutes(slot.end),
});

export const getTimetableDataTimeRange = (slot: CourseTimeslotData) => {
  if (slot.customSlot) return getCustomSlotTimeRange(slot.customSlot);
  const start = scheduleTimeSlots[slot.startTime];
  const end = scheduleTimeSlots[slot.endTime];
  return {
    start: start ? timeToMinutes(start.start) : timetableGridStart,
    end: end ? timeToMinutes(end.end) : timetableGridEnd,
  };
};

const courseTimeSlotKeys = (slot: CourseTimeslotData) => {
  if (slot.customSlot) return [];
  return Array.from(
    { length: slot.endTime - slot.startTime + 1 },
    (_, index) => `${slot.dayOfWeek}:${slot.startTime + index}`,
  );
};

const overlapsForLayout = (
  left: CourseTimeslotData,
  right: CourseTimeslotData,
) => {
  if (left.dayOfWeek !== right.dayOfWeek) return false;
  if (!left.customSlot && !right.customSlot) {
    const rightKeys = new Set(courseTimeSlotKeys(right));
    return courseTimeSlotKeys(left).some((key) => rightKeys.has(key));
  }
  const leftRange = getTimetableDataTimeRange(left);
  const rightRange = getTimetableDataTimeRange(right);
  return leftRange.start < rightRange.end && rightRange.start < leftRange.end;
};

/**
 * Retains the course row overlap behaviour and extends it to real-time custom
 * slots. Every overlapping block receives a column, so both blocks remain
 * readable and clickable even when a custom item crosses a course.
 */
export const addTimetableFractions = (data: CourseTimeslotData[]) =>
  data.reduce(
    (result, current, index) => {
      const overlapping = data.filter((candidate) =>
        overlapsForLayout(current, candidate),
      );
      const usedColumns = new Set<number>();
      result.forEach((previous, previousIndex) => {
        if (previousIndex < index && overlapsForLayout(current, previous)) {
          usedColumns.add(previous.fractionIndex);
        }
      });
      let fractionIndex = 1;
      while (usedColumns.has(fractionIndex)) fractionIndex += 1;
      result.push({
        ...current,
        fraction: Math.max(1, overlapping.length),
        fractionIndex,
        timeSlots: courseTimeSlotKeys(current),
      });
      return result;
    },
    [] as Array<
      CourseTimeslotData & {
        fraction: number;
        fractionIndex: number;
        timeSlots: string[];
      }
    >,
  );

export const createTimetableFromCourses = (
  data: MinimalCourse[],
  colorMap: { [courseId: string]: string } = colorMapFromCourses(
    data.map((i) => i.raw_id),
    timetableColors[Object.keys(timetableColors)[0]],
  ),
) => {
  const newTimetableData: CourseTimeslotData[] = [];

  data!.forEach((course) => {
    if (!hasTimes(course)) return;
    course.times.forEach((timeString, index) => {
      const timeslots =
        timeString
          .match(/.{1,2}/g)
          ?.map((day) => ({ day: day[0], time: day[1] })) ?? [];
      const groupedTimeslots: { day: string; time: string }[][] = [];
      timeslots.reduce((groups, current) => {
        const previousGroup = groups[groups.length - 1];
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
          groups.push([current]);
        }
        return groups;
      }, groupedTimeslots);

      groupedTimeslots.forEach((group) => {
        const day = group[0]!.day;
        const times = group.map((time) =>
          scheduleTimeSlots.findIndex((period) => period.time === time.time),
        );
        const startTime = Math.min(...times);
        const endTime = Math.max(...times);
        const color = colorMap[course.raw_id] || "#555555";
        newTimetableData.push({
          course,
          venue: course.venues![index]!,
          dayOfWeek: "MTWRFS".indexOf(day),
          startTime,
          endTime,
          color,
          textColor: getContrastColor(color),
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
    times: [],
    teacher_zh: [],
    teacher_en: [],
  }) as unknown as MinimalCourse;

const nearestPeriodIndex = (minutes: number, end = false) => {
  const index = scheduleTimeSlots.findIndex((period) => {
    const periodMinutes = timeToMinutes(end ? period.end : period.start);
    return end ? periodMinutes >= minutes : periodMinutes > minutes;
  });
  return index >= 0 ? index : scheduleTimeSlots.length - 1;
};

export const createTimetableFromCustomItems = (
  items: CustomTimetableItemInput[],
): CourseTimeslotData[] => {
  const timetableData: CourseTimeslotData[] = [];
  const normalizedItems = items
    .map(normalizeCustomTimetableItem)
    .filter((item): item is CustomTimetableItem => item !== null);

  normalizedItems.forEach((item) => {
    const customCourse = customItemAsCourse(item);
    item.slots.forEach((customSlot) => {
      const range = getCustomSlotTimeRange(customSlot);
      const color = item.color || "#555555";
      timetableData.push({
        course: customCourse,
        customItem: item,
        customSlot,
        venue: item.venue ?? "",
        dayOfWeek: customSlot.day,
        startTime: nearestPeriodIndex(range.start),
        endTime: nearestPeriodIndex(range.end, true),
        color,
        textColor: getContrastColor(color),
      });
    });
  });
  return timetableData;
};

export const createTimetableFromCoursesAndCustomItems = (
  courses: MinimalCourse[],
  customItems: CustomTimetableItemInput[],
  colorMap: { [courseId: string]: string } = colorMapFromCourses(
    courses.map((course) => course.raw_id),
    timetableColors[Object.keys(timetableColors)[0]],
  ),
) => [
  ...createTimetableFromCourses(courses, colorMap),
  ...createTimetableFromCustomItems(customItems),
];
