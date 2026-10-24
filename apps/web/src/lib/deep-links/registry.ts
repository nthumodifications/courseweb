import { CAMPUS_BUILDING_IDENTITIES } from "@courseweb/shared";
import { LAUNDRY_AREAS, LAUNDRY_DORMS } from "@/const/laundry-machines";
import {
  CAMPUS_BUS_STOP_NAMES,
  linesDict,
} from "@/features/bus/campusBusLines";
import { BUS_TABS } from "@/features/bus/busTab";
import {
  LIBRARY_BRANCHES,
  LIBRARY_CATEGORIES,
} from "@/app/[lang]/(mods-pages)/library/deep-link";
import { SHOP_AREAS } from "@/app/[lang]/(mods-pages)/shops/deep-link";
import {
  YOUBIKE_STATION_ID_PATTERN,
  YOUBIKE_TABS,
} from "@/app/[lang]/(mods-pages)/youbike/deep-link";
import { CALENDAR_DISPLAY_MODES } from "@/components/Calendar/deep-link";
import {
  SETTINGS_SECTION_IDS,
  SETTINGS_SETTING_IDS,
} from "@/app/[lang]/(mods-pages)/settings/sectionHash";
import { TAIPEI_DATE_KEY_PATTERN } from "@/helpers/dates";
import { REVIEW_SEMESTER_PATTERN } from "@/lib/review-lock";
import {
  CCXP_IMPORT_SOURCE,
  CCXP_SEMESTER_ID_PATTERN,
} from "@/helpers/ccxpImport";

export type DeepLinkDescription = { zh: string; en: string };
export type DeepLinkValues =
  | (() => readonly string[])
  | "free-text"
  | { pattern: string };

export type DeepLinkParam = {
  name: string;
  description: DeepLinkDescription;
  values: DeepLinkValues;
  example: string;
  lineValues?: () => Readonly<Record<string, DeepLinkValues>>;
  runtime?: boolean;
};

export type DeepLinkRoute = {
  route: string;
  duplicates: "ignored" | "first-value";
  params: readonly DeepLinkParam[];
  examples: readonly string[];
};

const values =
  (items: readonly string[]): (() => readonly string[]) =>
  () =>
    items;

const laundryDormValues = () => [
  ...Object.keys(LAUNDRY_DORMS),
  ...Object.values(LAUNDRY_DORMS).map(({ slug }) => slug),
];

const laundryAreaValues = () => [
  ...Object.keys(LAUNDRY_AREAS),
  ...Object.values(LAUNDRY_AREAS).map(({ slug }) => slug),
];

const shopBuildingValues = () => [
  ...new Set(
    SHOP_AREAS.flatMap((area) => {
      const matches = area.match(/^(.+?)(?:\d樓|\dF)$/);
      return matches ? [matches[1], area] : [area];
    }),
  ),
];

const buildingValues = () =>
  CAMPUS_BUILDING_IDENTITIES.map((identity) => identity.id);
const venueValues = () =>
  CAMPUS_BUILDING_IDENTITIES.flatMap((identity) => identity.venue.aliases);

const lineStopValues = (line: (typeof linesDict)[string]): DeepLinkValues =>
  values([...new Set([...line.stations_zh, ...line.stations_en])]);

const lineValues = (keys: readonly string[]) => () =>
  Object.fromEntries(
    keys.flatMap((key) => {
      const line = linesDict[key];
      return line ? [[key, lineStopValues(line)] as const] : [];
    }),
  );

export const DEEP_LINK_REGISTRY: readonly DeepLinkRoute[] = [
  {
    route: "/bus",
    duplicates: "ignored",
    params: [
      {
        name: "tab",
        description: {
          zh: "校車分頁。",
          en: "Campus bus tab.",
        },
        values: values(BUS_TABS),
        example: "nanda",
      },
      {
        name: "stop",
        description: {
          zh: "校園站名；中文精確比對並去除前後空白，英文比對不分大小寫。重複站名會選擇尚未離站的第一個。",
          en: "Campus stop name; Chinese matching trims whitespace and English matching ignores case. The first not-yet-passed duplicate is selected.",
        },
        values: values(CAMPUS_BUS_STOP_NAMES),
        example: "General Building II",
      },
    ],
    examples: [
      "/zh/bus?tab=nanda",
      "/en/bus?tab=north_gate&stop=General%20Building%20II",
    ],
  },
  {
    route: "/bus/main/:line",
    duplicates: "ignored",
    params: [
      {
        name: "stop",
        description: {
          zh: "該校園路線的站名。",
          en: "A stop name on the selected campus line.",
        },
        values: "free-text",
        example: "綜二",
        lineValues: lineValues(["green", "red"]),
      },
    ],
    examples: ["/zh/bus/main/green?stop=%E7%B6%9C%E4%BA%8C"],
  },
  {
    route: "/bus/nanda/:line",
    duplicates: "ignored",
    params: [
      {
        name: "stop",
        description: {
          zh: "該南大路線的站名。",
          en: "A stop name on the selected Nanda line.",
        },
        values: "free-text",
        example: "TSMC Building(Baoshan Rd.)",
        lineValues: lineValues([
          "route1_up",
          "route1_down",
          "route2_up",
          "route2_down",
        ]),
      },
    ],
    examples: [
      "/en/bus/nanda/route1_up?stop=TSMC%20Building%28Baoshan%20Rd.%29",
    ],
  },
  {
    route: "/bus/city/:route",
    duplicates: "first-value",
    params: [
      {
        name: "direction",
        description: {
          zh: "該城市公車路線資料中的方向 ID。",
          en: "Direction ID from the selected city-bus route data.",
        },
        values: "free-text",
        example: "HSZ000801",
        runtime: true,
      },
      {
        name: "stop",
        description: {
          zh: "該城市公車方向資料中的站點 ID。",
          en: "Stop ID from the selected city-bus direction data.",
        },
        values: "free-text",
        example: "HSZ303582",
        runtime: true,
      },
    ],
    examples: ["/zh/bus/city/83?direction=HSZ000801&stop=HSZ303582"],
  },
  {
    route: "/laundry",
    duplicates: "ignored",
    params: [
      {
        name: "dorm",
        description: {
          zh: "宿舍 key 或 slug；會覆寫已儲存的宿舍。",
          en: "Dorm key or slug; overrides the stored dorm.",
        },
        values: laundryDormValues,
        example: "jen",
      },
      {
        name: "area",
        description: {
          zh: "洗衣區 key 或 slug；沒有 dorm 時會推導宿舍。",
          en: "Laundry-area key or slug; implies its dorm when dorm is absent.",
        },
        values: laundryAreaValues,
        example: "jen_m",
      },
    ],
    examples: ["/zh/laundry?dorm=jen&area=jen_m"],
  },
  {
    route: "/library",
    duplicates: "ignored",
    params: [
      {
        name: "branch",
        description: { zh: "圖書館分館。", en: "Library branch." },
        values: values(LIBRARY_BRANCHES),
        example: "moonlight",
      },
      {
        name: "category",
        description: { zh: "座位類別。", en: "Seat category." },
        values: values(LIBRARY_CATEGORIES),
        example: "carrel",
      },
    ],
    examples: ["/en/library?branch=moonlight&category=carrel"],
  },
  {
    route: "/shops",
    duplicates: "ignored",
    params: [
      {
        name: "area",
        description: {
          zh: "areas.json 中的完整區域名稱。",
          en: "An exact area name from areas.json.",
        },
        values: values(SHOP_AREAS),
        example: "風雲1樓",
      },
      {
        name: "building",
        description: {
          zh: "areas.json 區域名稱的建築前綴；多個匹配時會保留篩選清單。",
          en: "A building prefix from areas.json; multiple matches remain as a filter list.",
        },
        values: shopBuildingValues,
        example: "風雲",
      },
    ],
    examples: [
      "/zh/shops?area=%E9%A2%A8%E9%9B%B21%E6%A8%93",
      "/zh/shops?building=%E9%A2%A8%E9%9B%B2",
    ],
  },
  {
    route: "/map",
    duplicates: "first-value",
    params: [
      {
        name: "building",
        description: {
          zh: "校園建築 identity ID，來源為 campus-building manifest。",
          en: "Campus building identity ID from the campus-building manifest.",
        },
        values: buildingValues,
        example: "delta",
      },
      {
        name: "venue",
        description: {
          zh: "建築 code、名稱、prefix 或 alias；由同一組 building identities 驗證。",
          en: "Building code, name, prefix, or alias validated by the same building identities.",
        },
        values: venueValues,
        example: "Delta Hall",
      },
      {
        name: "feature",
        description: {
          zh: "下載的校園地圖 building、water 或 area feature ID；值會依目前地圖資料驗證。",
          en: "A building, water, or area feature ID from the downloaded campus map data; validated against the current map data.",
        },
        values: "free-text",
        example: "osm-relation-3927538-0",
      },
    ],
    examples: ["/zh/map?building=delta", "/en/map?venue=Delta%20Hall"],
  },
  {
    route: "/youbike",
    duplicates: "ignored",
    params: [
      {
        name: "tab",
        description: { zh: "YouBike 篩選分頁。", en: "YouBike filter tab." },
        values: values(YOUBIKE_TABS),
        example: "main",
      },
      {
        name: "station",
        description: {
          zh: "YouBike 九位數站點 ID；站點必須存在於目前 API 資料。",
          en: "Nine-digit YouBike station ID; the station must exist in the current API data.",
        },
        values: { pattern: YOUBIKE_STATION_ID_PATTERN },
        example: "500401008",
        runtime: true,
      },
    ],
    examples: ["/zh/youbike?tab=main&station=500401008"],
  },
  {
    route: "/sports-venues",
    duplicates: "ignored",
    params: [
      {
        name: "facility",
        description: {
          zh: "目前運動場館資料中的中文場館名稱。",
          en: "A Chinese facility name from the current sports-venue data.",
        },
        values: "free-text",
        example: "體育館",
        runtime: true,
      },
    ],
    examples: ["/zh/sports-venues?facility=%E9%AB%94%E8%82%B2%E9%A4%A8"],
  },
  {
    route: "/calendar",
    duplicates: "ignored",
    params: [
      {
        name: "date",
        description: {
          zh: "台北時區的有效日期，作為檢視錨點。",
          en: "A valid Taipei-time date used as the view anchor.",
        },
        values: { pattern: TAIPEI_DATE_KEY_PATTERN },
        example: "2026-10-24",
      },
      {
        name: "view",
        description: { zh: "行事曆檢視模式。", en: "Calendar display mode." },
        values: values(CALENDAR_DISPLAY_MODES),
        example: "month",
      },
    ],
    examples: ["/zh/calendar?date=2026-10-24&view=month"],
  },
  {
    route: "/announcements",
    duplicates: "ignored",
    params: [
      {
        name: "source",
        description: {
          zh: "目前公告 API 資料中的 source ID。",
          en: "A source ID from the current announcements API data.",
        },
        values: "free-text",
        example: "source-academic",
        runtime: true,
      },
    ],
    examples: ["/zh/announcements?source=source-academic"],
  },
  {
    route: "/settings",
    duplicates: "first-value",
    params: [
      {
        name: "#section",
        description: {
          zh: "設定頁可定位的 section 或 setting hash。",
          en: "A settings section or setting hash that the page can scroll to.",
        },
        values: values([...SETTINGS_SECTION_IDS, ...SETTINGS_SETTING_IDS]),
        example: "account",
      },
    ],
    examples: ["/zh/settings#account", "/en/settings#setting-dark-mode"],
  },
  {
    route: "/reviews/past",
    duplicates: "first-value",
    params: [
      {
        name: "semester",
        description: {
          zh: "將指定學期排在待評價課程清單前面。",
          en: "Places the selected semester first in the past-course review list.",
        },
        values: { pattern: REVIEW_SEMESTER_PATTERN },
        example: "11420",
      },
    ],
    examples: ["/zh/reviews/past?semester=11420"],
  },
  {
    route: "/courses/modules",
    duplicates: "first-value",
    params: [
      {
        name: "q",
        description: {
          zh: "模組搜尋文字。",
          en: "Module search text.",
        },
        values: "free-text",
        example: "computer",
      },
    ],
    examples: ["/en/courses/modules?q=computer"],
  },
  {
    route: "/courses/module/:moduleKey",
    duplicates: "first-value",
    params: [
      {
        name: "title",
        description: {
          zh: "模組變體標題；不符合目前模組資料時使用預設變體。",
          en: "Module variant title; an unknown title falls back to the default variant.",
        },
        values: "free-text",
        example: "Introduction to Computer Science",
      },
    ],
    examples: [
      "/en/courses/module/CS%3A101?title=Introduction%20to%20Computer%20Science",
    ],
  },
  {
    route: "/timetable/view",
    duplicates: "first-value",
    params: [
      {
        name: "semester_<semester>",
        description: {
          zh: "課表分享或 CCXP 匯入的學期課程清單 key，例如 semester_11510。",
          en: "A semester course-list key for timetable sharing or CCXP import, such as semester_11510.",
        },
        values: { pattern: `semester_${CCXP_SEMESTER_ID_PATTERN}` },
        example: "semester_11510=11510CS 535100",
      },
      {
        name: "source",
        description: {
          zh: "使用 CCXP 匯入模式時為 ccxp。",
          en: "Use ccxp to select CCXP import mode.",
        },
        values: values([CCXP_IMPORT_SOURCE]),
        example: CCXP_IMPORT_SOURCE,
      },
    ],
    examples: [
      "/zh/timetable/view?semester_11510=11510CS%20535100&source=ccxp",
    ],
  },
];

export const INTERNAL_PARAMS: Readonly<Record<string, string>> = {
  return_url:
    "Bus detail pages use this navigation-only return target; it is not an external deep-link contract.",
  "nthu_courses[menu][semester]":
    "InstantSearch writes this internal routing state; use the documented department link for external course links.",
  department:
    "Courses uses this only for SEO metadata; it is not a search refinement deep link.",
  colorMap:
    "Timetable view reads this app-generated share payload; it is not a public deep-link parameter.",
  customItems:
    "Timetable view reads this app-generated share payload; it is not a public deep-link parameter.",
  theme:
    "Settings theme import is a private serialized preview payload, not a stable public route parameter.",
  code: "OAuth callback transport parameter.",
  state: "OAuth callback transport parameter.",
  error: "OAuth callback transport parameter.",
};
