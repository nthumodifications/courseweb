export interface LibraryVacancyItem {
  spacetype: number;
  spacetypename: string;
  zoneid: string;
  zonename: string;
  count: number;
}

export interface LibraryVacancyResponse {
  rescode: number;
  resmsg: string;
  rows: LibraryVacancyItem[];
}

export type LibraryBranch = "all" | "main" | "moonlight" | "hss" | "ctm";

export type SpaceCategory =
  | "all"
  | "moonlight"
  | "discussion"
  | "carrel"
  | "workstation"
  | "av"
  | "group";

export const LIBRARY_BOOKING_URL = "https://libsms.lib.nthu.edu.tw";
export const LIBRARY_API_ENDPOINT =
  "https://libsms.lib.nthu.edu.tw/RWDAPI_New/GetDevUseStatus.aspx";

/**
  Determines library branch for a vacancy item based on its spacetype and zonename.
 */
export function getBranchFromItem(item: LibraryVacancyItem): LibraryBranch {
  if (item.spacetype === 8 || item.zonename.includes("夜讀區")) {
    return "moonlight";
  }
  if (item.zonename.startsWith("人社") || item.spacetypename.includes("人社")) {
    return "hss";
  }
  if (item.zonename.startsWith("科管院")) {
    return "ctm";
  }
  return "main";
}

/**
  Determines space category for a vacancy item based on its spacetype.
 */
export function getCategoryFromItem(item: LibraryVacancyItem): SpaceCategory {
  switch (item.spacetype) {
    case 8:
      return "moonlight";
    case 2:
    case 4:
      return "discussion";
    case 1:
    case 7:
    case 14:
      return "carrel";
    case 9:
    case 10:
      return "workstation";
    case 3:
      return "av";
    case 5:
    case 6:
      return "group";
    default:
      return "discussion";
  }
}

/**
  Best-effort capacity estimation for zones to display progress percentages.
 */
const CAPACITY_ESTIMATES: Record<string, number> = {
  "4F-夜讀區A": 45,
  "4F-夜讀區B": 35,
  "4F-夜讀區C": 55,
  "4F-夜讀區D": 50,
  "4F-夜讀區E": 65,
  "3F-單人聆賞席": 50,
  "3F-雙人聆賞席": 20,
  "3F-多人聆賞席": 10,
  "1F-資訊島": 40,
  "2F-資訊島": 30,
  "3F-資訊島": 25,
  "4F-資訊島": 20,
  "5F-資訊島": 20,
  "6F-資訊島": 20,
  "2F-學習教室": 40,
  "人社1F-資訊島": 20,
  "人社2F-資訊島": 25,
};

export function getZoneCapacity(item: LibraryVacancyItem): number | null {
  if (CAPACITY_ESTIMATES[item.zonename]) {
    return CAPACITY_ESTIMATES[item.zonename];
  }
  // For small rooms/carrels, the count represents available room count.
  if (item.spacetype === 1) return 15; // 研究小間
  if (item.spacetype === 2 || item.spacetype === 4) return 8; // 討論室
  if (item.spacetype === 7 || item.spacetype === 14) return 15; // 享時小間
  if (item.spacetype === 5 || item.spacetype === 6) return 5; // 團體/簡報室
  return null;
}

export interface OperatingHours {
  open: string;
  close: string;
  is24h?: boolean;
}

export interface DayHours {
  weekday: OperatingHours;
  saturday: OperatingHours | null;
  sunday: OperatingHours | null;
}

export const BRANCH_WEEKLY_HOURS: Record<
  Exclude<LibraryBranch, "all">,
  DayHours
> = {
  moonlight: {
    weekday: { open: "00:00", close: "23:59", is24h: true },
    saturday: { open: "00:00", close: "23:59", is24h: true },
    sunday: { open: "00:00", close: "23:59", is24h: true },
  },
  main: {
    weekday: { open: "08:00", close: "22:00" },
    saturday: { open: "09:00", close: "17:00" },
    sunday: { open: "09:00", close: "17:00" },
  },
  hss: {
    weekday: { open: "08:30", close: "21:30" },
    saturday: { open: "09:00", close: "17:00" },
    sunday: null,
  },
  ctm: {
    weekday: { open: "08:30", close: "21:30" },
    saturday: { open: "09:00", close: "17:00" },
    sunday: null,
  },
};

export interface TaipeiTimeParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  hours: number;
  minutes: number;
}

/**
  Returns Taiwan local time (Asia/Taipei) Date object.
 */
export function getTaipeiDate(date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 8);
}

/**
  Extracts Asia/Taipei timezone date and time components accurately using Intl.DateTimeFormat.
 */
export function getTaipeiTimeParts(date = new Date()): TaipeiTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeekIndex = dayNames.indexOf(map.weekday ?? "Sun");

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    dayOfWeek: dayOfWeekIndex >= 0 ? dayOfWeekIndex : 0,
    hours: parseInt(map.hour, 10) % 24,
    minutes: parseInt(map.minute, 10),
  };
}

/**
  Checks if a given date in Taiwan is a recognized national holiday.
 */
export function isTaiwanNationalHoliday(parts: TaipeiTimeParts): boolean {
  const mmdd = `${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
  const yyyymmdd = `${parts.year}-${mmdd}`;

  const fixedHolidays = [
    "01-01", // New Year's Day (元旦)
    "02-28", // 228 Memorial Day (和平紀念日)
    "04-04", // Children's Day (兒童節)
    "04-05", // Tomb Sweeping Day (清明節)
    "05-01", // Labor Day (勞動節)
    "10-10", // National Day (國慶日)
  ];

  // Official Lunar New Year, Dragon Boat, and Mid-Autumn dates
  const lunarHolidays = [
    // 2025
    "2025-01-27",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    "2025-01-31",
    "2025-02-01",
    "2025-05-31",
    "2025-10-06",
    // 2026
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-02-19",
    "2026-02-20",
    "2026-06-19",
    "2026-09-25",
    // 2027
    "2027-02-06",
    "2027-02-07",
    "2027-02-08",
    "2027-02-09",
    "2027-02-10",
    "2027-06-09",
    "2027-09-15",
  ];

  return fixedHolidays.includes(mmdd) || lunarHolidays.includes(yyyymmdd);
}

export type BranchOpenStatus =
  | { status: "open_24h"; is24h: true }
  | { status: "open"; openTill: string }
  | { status: "closed"; isHoliday?: boolean };

/**
  Checks operating status of a library branch at a given time in Asia/Taipei,
  taking into account Weekday vs Weekend hours and National Holidays.
  Note: Moonlight Area (24H) is exempt from national holiday closures.
 */
export function getBranchOpenStatus(
  branch: LibraryBranch,
  now = new Date(),
): BranchOpenStatus {
  const parts = getTaipeiTimeParts(now);
  const targetBranch = branch === "all" ? "main" : branch;

  if (targetBranch === "moonlight") {
    return { status: "open_24h", is24h: true };
  }

  if (isTaiwanNationalHoliday(parts)) {
    return { status: "closed", isHoliday: true };
  }

  const weekly = BRANCH_WEEKLY_HOURS[targetBranch];
  if (!weekly) return { status: "closed" };

  const day = parts.dayOfWeek;
  let hours: OperatingHours | null;

  if (day === 0) {
    hours = weekly.sunday;
  } else if (day === 6) {
    hours = weekly.saturday;
  } else {
    hours = weekly.weekday;
  }

  if (!hours) return { status: "closed" };
  if (hours.is24h) return { status: "open_24h", is24h: true };

  const currentMinutes = parts.hours * 60 + parts.minutes;

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return { status: "open", openTill: hours.close };
  }

  return { status: "closed" };
}

const ZONE_NAME_EN_MAP: Record<string, string> = {
  "5F-研究小間A": "5F Study Carrels A",
  "5F-研究小間B": "5F Study Carrels B",
  "2F-討論室": "2F Discussion Rooms",
  "3F-討論室": "3F Discussion Rooms",
  "4F-討論室": "4F Discussion Rooms",
  "5F-討論室": "5F Discussion Rooms",
  "6F-討論室": "6F Discussion Rooms",
  "科管院3F-討論室": "CTM 3F Discussion Rooms",
  "3F-雙人聆賞席": "3F Double AV Seats",
  "3F-多人聆賞席": "3F Group AV Seats",
  "3F-單人聆賞席": "3F Single AV Seats",
  "人社2F-討論室": "HSS 2F Discussion Rooms",
  "3F-簡報練習室": "3F Presentation Room",
  "3F-小舞台": "3F Small Stage",
  "3F-團體室-綠巨人浩克3D": "3F Group Room (Hulk 3D)",
  "3F-團體室-紫色姊妹花": "3F Group Room (Purple Sisters)",
  "6F-享時小間603~615": "6F Carrels 603~615",
  "6F-享時小間616~626": "6F Carrels 616~626",
  "4F-夜讀區A": "4F Moonlight Area A",
  "4F-夜讀區B": "4F Moonlight Area B",
  "4F-夜讀區C": "4F Moonlight Area C",
  "4F-夜讀區D": "4F Moonlight Area D",
  "4F-夜讀區E": "4F Moonlight Area E",
  "2F-電腦共學區": "2F PC Learning Zone",
  "3F-語言學習區": "3F Language Learning Zone",
  "人社2F-享時小間": "HSS 2F Carrels",
  "1F-資訊島": "1F PC Workstations",
  "2F-資訊島": "2F PC Workstations",
  "3F-資訊島": "3F PC Workstations",
  "4F-資訊島": "4F PC Workstations",
  "5F-資訊島": "5F PC Workstations",
  "6F-資訊島": "6F PC Workstations",
  "2F-學習教室": "2F Learning Classroom",
  "人社1F-資訊島": "HSS 1F PC Workstations",
  "人社2F-資訊島": "HSS 2F PC Workstations",
};

export function formatZoneName(zonename: string, language: string): string {
  if (language !== "en") return zonename;
  return ZONE_NAME_EN_MAP[zonename] ?? zonename;
}
