import { GoogleGenAI } from "@google/genai";
import { parseHTML } from "linkedom/worker";
import prismaClients from "../prisma/client";
import type { D1Database } from "@cloudflare/workers-types";

const PEO_PAGE_URL = "https://nthupeo.site.nthu.edu.tw/p/412-1265-14409.php";
const PEO_BASE_URL = "https://nthupeo.site.nthu.edu.tw";
export const SPORTS_CACHE_KEY = "peo_opening_times";

export interface TimeSlot {
  open: string;  // "HH:MM" 24-hour
  close: string; // "HH:MM" 24-hour
}

export interface DaySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  holiday: TimeSlot[]; // empty array means closed on holidays
  notes: string | null;
}

export interface FacilitySchedule {
  name_zh: string;
  name_en: string;
  schedules: {
    semester: string; // e.g. "上學期", "寒假", "下學期", "暑假"
    pdf_url: string;
    hours: DaySchedule | null;
  }[];
}

export interface PeoOpeningTimesCache {
  facilities: FacilitySchedule[];
  lastUpdated: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function parsePdfWithGemini(
  pdfUrl: string,
  facilityNameZh: string,
  apiKey: string,
): Promise<{ name_en: string; hours: DaySchedule } | null> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) return null;

    const pdfBuffer = await response.arrayBuffer();
    const base64Data = arrayBufferToBase64(pdfBuffer);

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
            {
              text: `This is an opening hours schedule PDF for the NTHU (National Tsing Hua University) sports facility: "${facilityNameZh}".

Extract the opening hours and return ONLY a JSON object in this exact format:
{
  "name_en": "English name of the facility",
  "monday": [{"open": "HH:MM", "close": "HH:MM"}],
  "tuesday": [{"open": "HH:MM", "close": "HH:MM"}],
  "wednesday": [{"open": "HH:MM", "close": "HH:MM"}],
  "thursday": [{"open": "HH:MM", "close": "HH:MM"}],
  "friday": [{"open": "HH:MM", "close": "HH:MM"}],
  "saturday": [{"open": "HH:MM", "close": "HH:MM"}],
  "sunday": [{"open": "HH:MM", "close": "HH:MM"}],
  "holiday": [],
  "notes": "any notes in Traditional Chinese, or null"
}

Rules:
- Each day is an ARRAY of time slots (a facility may open in the morning, close at noon, then reopen in the afternoon — list each session as a separate object)
- Use 24-hour HH:MM format
- If a day is closed, use an empty array []
- If multiple days share the same hours, still list each day separately
- "holiday" means national holidays; use [] if closed
- "name_en" should be the standard English name for this type of facility`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = result.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    const { name_en, ...rawHours } = parsed;
    const toSlots = (v: unknown): TimeSlot[] => {
      if (!Array.isArray(v)) return [];
      return v.filter(
        (s): s is TimeSlot =>
          s !== null &&
          typeof s === "object" &&
          typeof (s as Record<string, unknown>).open === "string" &&
          typeof (s as Record<string, unknown>).close === "string",
      );
    };
    // Validate that each day field is an array of valid TimeSlot objects
    const hours: DaySchedule = {
      monday: toSlots(rawHours.monday),
      tuesday: toSlots(rawHours.tuesday),
      wednesday: toSlots(rawHours.wednesday),
      thursday: toSlots(rawHours.thursday),
      friday: toSlots(rawHours.friday),
      saturday: toSlots(rawHours.saturday),
      sunday: toSlots(rawHours.sunday),
      holiday: toSlots(rawHours.holiday),
      notes: typeof rawHours.notes === "string" ? rawHours.notes : null,
    };
    return { name_en: name_en ?? facilityNameZh, hours };
  } catch (e) {
    console.error(`Failed to parse PDF ${pdfUrl}:`, e);
    return null;
  }
}

export async function syncPeoOpeningTimes(env: {
  DB: D1Database;
  GOOGLE_AI_API_KEY?: string;
}): Promise<void> {
  if (!env.GOOGLE_AI_API_KEY) {
    console.warn("GOOGLE_AI_API_KEY not set, skipping PEO opening times sync");
    return;
  }

  // Fetch the PEO page
  const pageResponse = await fetch(PEO_PAGE_URL);
  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch PEO page: ${pageResponse.status}`);
  }
  const html = await pageResponse.text();
  const { document } = parseHTML(html);

  // Parse facility table: columns are [facility name, schedule links, notes]
  const rows = document.querySelectorAll("table tr");
  const facilities: FacilitySchedule[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll("td");
    if (cells.length < 2) continue;

    const name_zh = cells[0].textContent?.trim() ?? "";
    if (!name_zh) continue;

    // Semester PDF links are each in their own <td> — collect from all cells after the name
    const links: Element[] = [];
    for (let k = 1; k < cells.length; k++) {
      cells[k].querySelectorAll("a").forEach((a: Element) => links.push(a));
    }
    const schedules: FacilitySchedule["schedules"] = [];

    for (let j = 0; j < links.length; j++) {
      const href = links[j].getAttribute("href") ?? "";
      const semesterLabel = links[j].textContent?.trim() ?? `學期${j + 1}`;
      if (!href || !href.endsWith(".pdf")) continue;

      const pdfUrl = href.startsWith("http")
        ? href
        : `${PEO_BASE_URL}${href}`;

      schedules.push({ semester: semesterLabel, pdf_url: pdfUrl, hours: null });
    }

    if (schedules.length > 0) {
      facilities.push({ name_zh, name_en: name_zh, schedules });
    }
  }

  // Load existing cache to reuse already-parsed results
  const prisma = await prismaClients.fetch(env.DB);
  const existing = await prisma.cache.findUnique({
    where: { key: SPORTS_CACHE_KEY },
  });

  // Map of pdf_url -> { name_en, hours } for already-parsed PDFs
  const existingParsed = new Map<
    string,
    { name_en: string; hours: DaySchedule }
  >();
  let cachedNameEn = new Map<string, string>(); // name_zh -> name_en

  if (existing) {
    try {
      const cached: PeoOpeningTimesCache = JSON.parse(existing.data);
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
    } catch {}
  }

  // Parse only new/unprocessed PDFs with Gemini
  for (const facility of facilities) {
    // Restore cached English name if available
    if (cachedNameEn.has(facility.name_zh)) {
      facility.name_en = cachedNameEn.get(facility.name_zh)!;
    }

    for (const schedule of facility.schedules) {
      if (existingParsed.has(schedule.pdf_url)) {
        const cached = existingParsed.get(schedule.pdf_url)!;
        schedule.hours = cached.hours;
        // Use English name from first successfully parsed PDF for this facility
        if (cached.name_en && cached.name_en !== facility.name_zh) {
          facility.name_en = cached.name_en;
        }
      } else {
        console.log(
          `Parsing PDF for ${facility.name_zh} / ${schedule.semester}`,
        );
        const parsed = await parsePdfWithGemini(
          schedule.pdf_url,
          facility.name_zh,
          env.GOOGLE_AI_API_KEY,
        );
        if (parsed) {
          schedule.hours = parsed.hours;
          if (parsed.name_en && parsed.name_en !== facility.name_zh) {
            facility.name_en = parsed.name_en;
          }
        }
      }
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
