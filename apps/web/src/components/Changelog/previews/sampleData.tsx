import type { DemandPoint } from "@/lib/module-insights";
import type { BusListingItemProps } from "@/features/bus/BusListingItem";
import { CityBusLineBadge } from "@/features/bus/CityBusLineBadge";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import type { CourseSyllabusView } from "@/config/supabase";
import type { MinimalCourse } from "@/types/courses";
import type { UsageSeries } from "@/lib/usage-forecast";
import { parsePrerequisites } from "@courseweb/shared";
import type {
  PrerequisiteGraphCourse,
  PrerequisiteGraphRow,
} from "@courseweb/shared";
import type { YouBikeStation } from "@/lib/youbike";

export const CITY_BUS_PREVIEW_REF_TIME = new Date("2026-10-07T14:00:00");

export const createCityBusPreviewItems = ({
  language,
  labels,
}: {
  language: "zh" | "en";
  labels: {
    line_83: string;
    line_blue: string;
    campus_line: string;
    campus_destination: string;
    destination_83: string;
    destination_blue: string;
    countdown_83: string;
  };
}): readonly BusListingItemProps[] => [
  {
    tab: "city",
    startTime: "14:47",
    refTime: CITY_BUS_PREVIEW_REF_TIME,
    leading: (
      <CityBusLineBadge
        nameZh="83"
        nameEn={labels.line_83}
        category="city"
        language={language}
      />
    ),
    line: "city",
    direction: "toward_north_gate",
    title: "83",
    destination: labels.destination_83,
    arrival: "14:47",
    exactArrival: true,
    detailLine: "83",
    countdown: labels.countdown_83,
  },
  {
    tab: "city",
    startTime: "15:02",
    refTime: CITY_BUS_PREVIEW_REF_TIME,
    leading: (
      <CityBusLineBadge
        nameZh="藍線"
        nameEn={labels.line_blue}
        category="city"
        language={language}
      />
    ),
    line: "city",
    direction: "toward_zhuzhong",
    title: labels.line_blue,
    destination: labels.destination_blue,
    arrival: "15:02",
    exactArrival: true,
    detailLine: "blue",
  },
  {
    tab: "north_gate",
    startTime: "14:53",
    refTime: CITY_BUS_PREVIEW_REF_TIME,
    Icon: RedLineIcon,
    line: "red",
    direction: "up",
    title: labels.campus_line,
    destination: labels.campus_destination,
    arrival: "14:53",
    exactArrival: true,
  },
];

export const COURSE_SEARCH_PREVIEW: CourseSyllabusView = {
  capacity: 75,
  class: "1",
  closed_mark: "",
  compulsory_for: ["資工系115BA"],
  course: "1355",
  credits: 3,
  cross_discipline: ["數據科學學分學程"],
  department: "CS",
  elective_for: [],
  enrolled: 75,
  first_specialization: ["數據科學"],
  ge_target: " ",
  ge_type: "",
  language: "中",
  name_en: "Introduction to Programming (I)",
  name_zh: "計算機程式設計一",
  no_extra_selection: false,
  note: "非資工本系生請修115下為資工輔系雙主修專長生開設同名課",
  prerequisites: "擋修對象 : 全校",
  raw_id: "11510CS  135501",
  reserve: 75,
  restrictions: "資工系大學部1年級優先",
  second_specialization: ["資訊工程", "數據科學", "電機工程"],
  semester: "11510",
  tags: [],
  teacher_en: ["MIN-CHUN HU"],
  teacher_zh: ["胡敏君"],
  times: ["M7M8R6"],
  time_slots: null,
  updated_at: "2026-09-08T14:33:59.36+00:00",
  venues: ["DELTA台達107"],
  brief: null,
  keywords: [],
};

export const COURSE_MODULE_PREVIEW_SEMESTERS = [
  "11310",
  "11320",
  "11410",
  "11420",
  "11510",
] as const;

export const COURSE_MODULE_PREVIEW_DEMAND: readonly DemandPoint[] = [
  { semester: "11310", enrolled: 150, capacity: 100, fill: 1.5, sections: 2 },
  { semester: "11320", enrolled: 63, capacity: 100, fill: 0.63, sections: 1 },
  { semester: "11410", enrolled: 100, capacity: 100, fill: 1, sections: 1 },
  { semester: "11420", enrolled: 79, capacity: 100, fill: 0.79, sections: 1 },
  { semester: "11510", enrolled: 97, capacity: 100, fill: 0.97, sections: 1 },
];

export const COURSE_MODULE_PREVIEW_STATS = [
  { value: "97%", label: "recent_fill", hint: "recent_fill_hint" },
  { value: "82", label: "average_score", hint: "percent_scale" },
] as const;

export const TIMETABLE_PREVIEW_COURSES: readonly MinimalCourse[] = [
  {
    raw_id: "11510CS  135501",
    name_zh: "計算機程式設計一",
    name_en: "Introduction to Programming (I)",
    semester: "11510",
    department: "CS",
    course: "1355",
    class: "1",
    credits: 3,
    venues: ["DELTA台達107"],
    times: ["M7M8R6"],
    teacher_zh: ["胡敏君"],
    teacher_en: ["MIN-CHUN HU"],
    language: "中",
  },
  {
    raw_id: "11510CS  135502",
    name_zh: "計算機程式設計一",
    name_en: "Introduction to Programming (I)",
    semester: "11510",
    department: "CS",
    course: "1355",
    class: "2",
    credits: 3,
    venues: ["DELTA台達105"],
    times: ["M7M8R6"],
    teacher_zh: ["羅婈"],
    teacher_en: ["LO,LING"],
    language: "英",
  },
];

export const TIMETABLE_PREVIEW_UNRESOLVED_COUNT = 1;

export const PREREQUISITE_PREVIEW_COURSE: PrerequisiteGraphCourse = {
  raw_id: "11510CS  210401",
  semester: "11510",
  department: "CS",
  course: "210401",
  name_zh: "資料結構",
  name_en: "Data Structures",
};

export const PREREQUISITE_PREVIEW_PARSED = parsePrerequisites(
  "先修科目 : 離散數學-成績需C-以上曾修線性代數上述條件任選一科，而且未修過資料庫系統上述條件一定要有，則不擋修。",
);

export const PREREQUISITE_PREVIEW_ROWS: readonly PrerequisiteGraphRow[] = [
  {
    raw_id: "11510CS  210401",
    semester: "11510",
    department: "CS",
    course: "210401",
    name_zh: "資料結構",
    name_en: "Data Structures",
    prerequisites: null,
  },
  {
    raw_id: "11510CS  210201",
    semester: "11510",
    department: "CS",
    course: "210201",
    name_zh: "離散數學",
    name_en: "Discrete Mathematics",
    prerequisites: null,
  },
  {
    raw_id: "11510CS  110101",
    semester: "11510",
    department: "CS",
    course: "110101",
    name_zh: "線性代數",
    name_en: "Linear Algebra",
    prerequisites: null,
  },
  {
    raw_id: "11510CS  210301",
    semester: "11510",
    department: "CS",
    course: "210301",
    name_zh: "資料庫系統",
    name_en: "Database Systems",
    prerequisites: null,
  },
  {
    raw_id: "11510CS  310001",
    semester: "11510",
    department: "CS",
    course: "310001",
    name_zh: "演算法",
    name_en: "Algorithms",
    prerequisites: "先修科目 : 曾修資料結構上述條件一定要有，則不擋修。",
  },
];

export const YOUBIKE_PREVIEW_STATIONS: readonly YouBikeStation[] = [
  {
    id: "500401004",
    nameZh: "清華大學(小吃部)",
    nameEn: "National Tsing Hua University (Small Food Center)",
    districtZh: "東區",
    districtEn: "East Dist",
    addressZh: "光復路二段101號",
    addressEn: "No. 101, Sec. 2, Kuang-Fu Rd.",
    totalCapacity: 48,
    availableBikes: 1,
    regularBikes: 0,
    eBikes: 1,
    emptyDocks: 47,
    lat: 24.79307,
    lng: 120.99335,
    status: 1,
    updatedAt: "2026-10-07 23:00:00",
  },
  {
    id: "500401030",
    nameZh: "清華大學(南大校區)",
    nameEn: "National Tsing Hua University (Nanda Campus)",
    districtZh: "東區",
    districtEn: "East Dist",
    addressZh: "食品路227號",
    addressEn: "No. 227, Shipin Rd.",
    totalCapacity: 60,
    availableBikes: 35,
    regularBikes: 31,
    eBikes: 4,
    emptyDocks: 24,
    lat: 24.79429,
    lng: 120.96453,
    status: 1,
    updatedAt: "2026-10-07 23:00:00",
  },
];

const USAGE_PREVIEW_TIMES = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
] as const;

const USAGE_PREVIEW_VALUES = [
  20, 24, 31, 36, 48, 55, 63, 70, 82, 86, 79, 72, 64, 58, 51, 42,
] as const;

export const USAGE_FORECAST_PREVIEW_NOW = new Date("2026-10-07T14:00:00+08:00");

export const USAGE_FORECAST_PREVIEW_SERIES: UsageSeries = {
  id: "preview-gym",
  name: "體育館",
  current: 64,
  currentAt: "2026-10-07T06:00:00.000Z",
  capacity: 100,
  status: "ready",
  weeksOfData: 8,
  level: "moderate",
  trend: "steady",
  today: USAGE_PREVIEW_TIMES.map((t, index) => ({
    t,
    expected: USAGE_PREVIEW_VALUES[index],
    low: Math.max(0, USAGE_PREVIEW_VALUES[index] - 10),
    high: USAGE_PREVIEW_VALUES[index] + 10,
    actual: USAGE_PREVIEW_VALUES[index],
    level: "moderate" as const,
  })),
  week: Array.from({ length: 7 }, () => [
    ...USAGE_PREVIEW_VALUES,
    ...Array(32).fill(null),
  ]),
  next: [
    { t: "14:30", expected: 58 },
    { t: "15:00", expected: 51 },
  ],
  peaks: [{ start: "12:00", end: "14:00" }],
  bestTime: { start: "08:00", end: "09:00" },
  anomaly: null,
  quality: { mae: 6.2, naiveMae: 8.1, skill: 0.23, samples: 96 },
};
