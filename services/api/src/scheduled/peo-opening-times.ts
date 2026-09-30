import { parseHTML } from "linkedom/worker";
import prismaClients from "../prisma/client";
import type { D1Database } from "@cloudflare/workers-types";
import { generateJSON, type LlmEnv } from "../ai/llm";

const PEO_PAGE_URL = "https://nthupeo.site.nthu.edu.tw/p/412-1265-14409.php";
const PEO_BASE_URL = "https://nthupeo.site.nthu.edu.tw";
export const SPORTS_CACHE_KEY = "peo_opening_times";

export interface TimeSlot {
  open: string;
  close: string;
}

export interface DaySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  holiday: TimeSlot[];
  notes: string | null;
}

export interface FacilitySchedule {
  name_zh: string;
  name_en: string;
  schedules: {
    semester: string;
    pdf_url: string;
    hours: DaySchedule | null;
  }[];
}

export interface PeoOpeningTimesCache {
  facilities: FacilitySchedule[];
  lastUpdated: string;
}

const PEO_SCHEMA = {
  type: "object",
  properties: {
    name_en: { type: "string" },
    time_periods: { type: "array", items: { type: "string" } },
    monday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    tuesday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    wednesday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    thursday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    friday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    saturday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    sunday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    holiday: { type: "array", items: { type: "object", properties: {
      open: { type: "string" }, close: { type: "string" },
    }, required: ["open", "close"] } },
    notes: { type: "string", description: "Use an empty string when there are no notes" },
  },
  required: [
    "name_en", "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "sunday", "holiday", "notes",
  ],
} as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toSlots(value: unknown): TimeSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const open = (slot as { open?: unknown }).open;
    const close = (slot as { close?: unknown }).close;
    if (
      typeof open !== "string" ||
      typeof close !== "string" ||
      !TIME_PATTERN.test(open) ||
      !TIME_PATTERN.test(close)
    ) {
      return [];
    }
    return [{ open, close }];
  });
}

export async function parsePdfWithProviders(
  pdfUrl: string,
  facilityNameZh: string,
  env: LlmEnv,
): Promise<{ name_en: string; hours: DaySchedule } | null> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const result = await generateJSON<Record<string, unknown>>({
      env,
      purpose: "bulk",
      pdf: { url: pdfUrl },
      system:
        "You extract public opening hours from NTHU sports facility PDFs. Return only the requested JSON. Exclude reservations, cleaning, maintenance, and non-public sessions.",
      text: `Facility: ${facilityNameZh}\nToday's date: ${today}\n\nChoose the date-range block containing today's date, or the nearest upcoming block. For each weekday, include only publicly open time slots. Use 24-hour HH:MM strings. Traditional Chinese notes are acceptable; use an empty string when there are no notes.`,
      schema: PEO_SCHEMA,
    });
    const parsed = result.data;
    const days = [
      "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
      "sunday", "holiday",
    ] as const;
    const hours = {} as DaySchedule;
    for (const day of days) hours[day] = toSlots(parsed[day]);
    hours.notes = typeof parsed.notes === "string" ? parsed.notes : null;
    return {
      name_en:
        typeof parsed.name_en === "string" && parsed.name_en.trim()
          ? parsed.name_en.trim()
          : facilityNameZh,
      hours,
    };
  } catch (error) {
    console.error(`Failed to parse PDF ${pdfUrl}:`, error);
    return null;
  }
}

export async function syncPeoOpeningTimes(
  env: LlmEnv & { DB: D1Database },
  forceSemester?: string,
): Promise<void> {
  const pageResponse = await fetch(PEO_PAGE_URL);
  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch PEO page: ${pageResponse.status}`);
  }
  const html = await pageResponse.text();
  const { document } = parseHTML(html);
  const rows = document.querySelectorAll("table tr");
  const facilities: FacilitySchedule[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll("td");
    if (cells.length < 2) continue;
    const name_zh = (cells[0].textContent ?? "").trim();
    if (!name_zh || name_zh.includes("\n")) continue;
    const links: any[] = [];
    for (let k = 1; k < cells.length; k++) {
      cells[k].querySelectorAll("a").forEach((a: any) => links.push(a));
    }
    const schedules: FacilitySchedule["schedules"] = [];
    for (let j = 0; j < links.length; j++) {
      const href = links[j].getAttribute("href") ?? "";
      const semester = links[j].textContent?.trim() ?? `學期${j + 1}`;
      if (!href || !href.toLowerCase().endsWith(".pdf")) continue;
      schedules.push({
        semester,
        pdf_url: href.startsWith("http") ? href : `${PEO_BASE_URL}${href}`,
        hours: null,
      });
    }
    if (schedules.length > 0) facilities.push({ name_zh, name_en: name_zh, schedules });
  }

  const prisma = await prismaClients.fetch(env.DB);
  const existing = await prisma.cache.findUnique({ where: { key: SPORTS_CACHE_KEY } });
  const existingParsed = new Map<string, { name_en: string; hours: DaySchedule }>();
  const cachedNameEn = new Map<string, string>();
  if (existing) {
    try {
      const cached = JSON.parse(existing.data) as PeoOpeningTimesCache;
      for (const facility of cached.facilities) {
        if (facility.name_en && facility.name_en !== facility.name_zh) {
          cachedNameEn.set(facility.name_zh, facility.name_en);
        }
        for (const schedule of facility.schedules) {
          if (schedule.hours !== null) {
            existingParsed.set(schedule.pdf_url, {
              name_en: facility.name_en,
              hours: schedule.hours,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse cached PEO opening times:", error);
    }
  }

  for (const facility of facilities) {
    if (cachedNameEn.has(facility.name_zh)) {
      facility.name_en = cachedNameEn.get(facility.name_zh)!;
    }
    let parsedAny = false;
    for (const schedule of facility.schedules) {
      const cached = existingParsed.get(schedule.pdf_url);
      const shouldParse = forceSemester === schedule.semester || !cached;
      if (cached) {
        // Seed with the last known good value. A failed forced refresh must
        // never replace it with null.
        schedule.hours = cached.hours;
        if (cached.name_en && cached.name_en !== facility.name_zh) {
          facility.name_en = cached.name_en;
        }
      }
      if (!shouldParse) continue;
      console.log(`Parsing PDF for ${facility.name_zh} / ${schedule.semester}`);
      const parsed = await parsePdfWithProviders(
        schedule.pdf_url,
        facility.name_zh,
        env,
      );
      if (parsed) {
        schedule.hours = parsed.hours;
        if (parsed.name_en && parsed.name_en !== facility.name_zh) {
          facility.name_en = parsed.name_en;
        }
        parsedAny = true;
      }
    }
    if (parsedAny) {
      const partial: PeoOpeningTimesCache = {
        facilities,
        lastUpdated: new Date().toISOString(),
      };
      await prisma.cache.upsert({
        where: { key: SPORTS_CACHE_KEY },
        update: { data: JSON.stringify(partial) },
        create: { key: SPORTS_CACHE_KEY, data: JSON.stringify(partial) },
      });
    }
  }

  const cacheData: PeoOpeningTimesCache = {
    facilities,
    lastUpdated: new Date().toISOString(),
  };
  await prisma.cache.upsert({
    where: { key: SPORTS_CACHE_KEY },
    update: { data: JSON.stringify(cacheData) },
    create: { key: SPORTS_CACHE_KEY, data: JSON.stringify(cacheData) },
  });
  console.log(`PEO opening times synced: ${facilities.length} facilities`);
}
