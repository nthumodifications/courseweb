import { GoogleGenAI } from "@google/genai";
import { parseHTML } from "linkedom/worker";
import prismaClients from "../prisma/client";
import type { D1Database } from "@cloudflare/workers-types";

const PEO_PAGE_URL = "https://nthupeo.site.nthu.edu.tw/p/412-1265-14409.php";
const PEO_BASE_URL = "https://nthupeo.site.nthu.edu.tw";
const CACHE_KEY = "peo_opening_times";

export interface FacilitySchedule {
  name_zh: string;
  schedules: {
    semester: string;
    pdf_url: string;
    opening_hours: string | null; // JSON string: { weekday, weekend, holiday, notes }
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
  apiKey: string,
): Promise<string | null> {
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
              text: `This is a sports facility opening hours schedule PDF from NTHU (National Tsing Hua University).
Extract the opening hours as a JSON object. Return ONLY valid JSON in this exact format:
{
  "weekday": "HH:MM-HH:MM",
  "weekend": "HH:MM-HH:MM",
  "holiday": "HH:MM-HH:MM or null",
  "notes": "brief notes in Traditional Chinese or null"
}
Use null for fields that are not specified. Time format must be HH:MM-HH:MM (24-hour).`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    return result.text ?? null;
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

    const links = cells[1].querySelectorAll("a");
    const schedules: FacilitySchedule["schedules"] = [];

    for (let j = 0; j < links.length; j++) {
      const href = links[j].getAttribute("href") ?? "";
      const semesterLabel = links[j].textContent?.trim() ?? `學期${j + 1}`;
      if (!href) continue;

      const pdfUrl = href.startsWith("http")
        ? href
        : `${PEO_BASE_URL}${href}`;

      schedules.push({ semester: semesterLabel, pdf_url: pdfUrl, opening_hours: null });
    }

    if (schedules.length > 0) {
      facilities.push({ name_zh, schedules });
    }
  }

  // Load existing cache to reuse already-parsed results
  const prisma = await prismaClients.fetch(env.DB);
  const existing = await prisma.cache.findUnique({ where: { key: CACHE_KEY } });

  const existingParsed = new Map<string, string | null>();
  if (existing) {
    try {
      const cached: PeoOpeningTimesCache = JSON.parse(existing.data);
      for (const facility of cached.facilities) {
        for (const schedule of facility.schedules) {
          if (schedule.opening_hours !== null) {
            existingParsed.set(schedule.pdf_url, schedule.opening_hours);
          }
        }
      }
    } catch {}
  }

  // Parse only new/unprocessed PDFs with Gemini
  for (const facility of facilities) {
    for (const schedule of facility.schedules) {
      if (existingParsed.has(schedule.pdf_url)) {
        schedule.opening_hours = existingParsed.get(schedule.pdf_url) ?? null;
      } else {
        console.log(`Parsing PDF for ${facility.name_zh} / ${schedule.semester}`);
        schedule.opening_hours = await parsePdfWithGemini(
          schedule.pdf_url,
          env.GOOGLE_AI_API_KEY,
        );
      }
    }
  }

  const cacheData: PeoOpeningTimesCache = {
    facilities,
    lastUpdated: new Date().toISOString(),
  };

  await prisma.cache.upsert({
    where: { key: CACHE_KEY },
    update: { data: JSON.stringify(cacheData) },
    create: { key: CACHE_KEY, data: JSON.stringify(cacheData) },
  });

  console.log(`PEO opening times synced: ${facilities.length} facilities`);
}
