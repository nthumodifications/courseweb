import { scheduleTimeSlots } from "@courseweb/shared";

export type AutoColorMode = "department" | "time_of_day";

export type AutoColorCourse = {
  raw_id: string;
  department: string;
  times: string[];
};

type TimeOfDayBand = "morning" | "afternoon" | "evening";

const DAY_CODES = "MTWRFSU";
const TIME_CODES = new Set(scheduleTimeSlots.map(({ time }) => time));

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const greatestCommonDivisor = (left: number, right: number): number =>
  right === 0 ? left : greatestCommonDivisor(right, left % right);

const assignDepartmentColors = (
  courses: readonly AutoColorCourse[],
  colors: readonly string[],
) => {
  const departmentColors = new Map<string, string>();
  if (colors.length === 0) return departmentColors;

  const usedIndexes = new Set<number>();
  const departments = [...new Set(courses.map(({ department }) => department))]
    .filter(Boolean)
    .sort();

  for (const department of departments) {
    const hash = stableHash(department);
    const preferredIndex = hash % colors.length;
    let step = (hash >>> 16) % colors.length || 1;
    while (greatestCommonDivisor(step, colors.length) !== 1) {
      step = (step + 1) % colors.length || 1;
    }

    let index = preferredIndex;
    for (let offset = 0; offset < colors.length; offset += 1) {
      const candidate = (preferredIndex + offset * step) % colors.length;
      if (!usedIndexes.has(candidate)) {
        index = candidate;
        break;
      }
    }
    usedIndexes.add(index);
    departmentColors.set(department, colors[index]!);
  }

  return departmentColors;
};

const getFirstCourseStartMinutes = (times: readonly string[]) => {
  const starts: number[] = [];
  for (const value of times) {
    const pairs = value.replace(/\s/g, "").match(/.{1,2}/g) ?? [];
    for (const pair of pairs) {
      const day = pair[0];
      const timeCode = pair[1];
      if (!day || !timeCode || !DAY_CODES.includes(day)) continue;
      if (!TIME_CODES.has(timeCode)) continue;
      const slot = scheduleTimeSlots.find(({ time }) => time === timeCode);
      if (!slot) continue;
      const [hours, minutes] = slot.start.split(":").map(Number);
      starts.push(hours! * 60 + minutes!);
    }
  }
  return starts.length > 0 ? Math.min(...starts) : null;
};

const getTimeOfDayBand = (times: readonly string[]): TimeOfDayBand => {
  const start = getFirstCourseStartMinutes(times);
  if (start === null || start < 12 * 60) return "morning";
  if (start < 17 * 60) return "afternoon";
  return "evening";
};

const getBandColors = (colors: readonly string[]) => {
  if (colors.length === 0) return {} as Record<TimeOfDayBand, string>;
  const bands: TimeOfDayBand[] = ["morning", "afternoon", "evening"];
  return Object.fromEntries(
    bands.map((band, index) => {
      const paletteIndex = Math.min(
        colors.length - 1,
        Math.floor(((index + 0.5) * colors.length) / bands.length),
      );
      return [band, colors[paletteIndex]!];
    }),
  ) as Record<TimeOfDayBand, string>;
};

export const assignAutomaticCourseColors = (
  courses: readonly AutoColorCourse[],
  colors: readonly string[],
  mode: AutoColorMode,
): Record<string, string> => {
  if (colors.length === 0) return {};

  if (mode === "department") {
    const departmentColors = assignDepartmentColors(courses, colors);
    return Object.fromEntries(
      courses.map((course) => [
        course.raw_id,
        departmentColors.get(course.department) ?? colors[0]!,
      ]),
    );
  }

  const bandColors = getBandColors(colors);
  return Object.fromEntries(
    courses.map((course) => [
      course.raw_id,
      bandColors[getTimeOfDayBand(course.times)] ?? colors[0]!,
    ]),
  );
};
