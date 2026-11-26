/**
 * @fileoverview
 * Course data scraping functions adapted from API service
 * These functions scrape course data and syllabus information, then sync them to Supabase
 */

import {
  HTMLOptionElement,
  HTMLTableCellElement,
  HTMLTableElement,
  parseHTML,
} from "linkedom/worker";
import type { Course, Department, SyncEnvironment } from "./types";
import {
  diffCourseRows,
  isCompleteCourseSnapshot,
  TRACKED_COURSE_FIELDS,
  type CourseSnapshot,
} from "./course-diff";
import {
  retryWithBackoff,
  fullWidthToHalfWidth,
  createSupabaseClient,
  SCRAPER_USER_AGENT,
} from "./utils";

const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629002.php`;

export const ccxpListingHasCourses = (html: string): boolean | undefined => {
  const doc = parseHTML(html).document;
  const table = Array.from(doc.querySelectorAll("table")).find((node) =>
    (node.textContent?.trim() ?? "").startsWith("科號"),
  );
  if (!table) return undefined;
  const rows = Array.from(table?.querySelectorAll("tr") ?? []);
  return rows.some((row, index) => {
    if (index < 2 || index % 2 !== 0) return false;
    const cells = row.querySelectorAll("td");
    return Boolean(cells[0]?.textContent?.trim());
  });
};

export const shouldSkipUpcomingSemesterScrape = (html: string) =>
  ccxpListingHasCourses(html) === false;

const CHANGE_LOG_PAGE_SIZE = 1_000;
const CHANGE_LOG_MAX_PAGES = 10;
const CHANGE_LOG_INSERT_CHUNK_SIZE = 500;
export const COURSE_CHANGE_LOG_TIMEOUT_MS = 60_000;
const CHANGE_LOG_SELECT = ["raw_id", "semester", ...TRACKED_COURSE_FIELDS].join(
  ",",
);

export const fetchOcrResult = async (acixStore: string): Promise<string> => {
  return await retryWithBackoff(
    async () => {
      const response = await fetch(
        `https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/mod/auth_img/auth_img.php?ACIXSTORE=${acixStore}&d=3`,
        { headers: { "User-Agent": SCRAPER_USER_AGENT } },
      );
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}; body: ${body.slice(0, 100)}`,
        );
      }
      const text = await response.text();
      if (text.length !== 3) {
        throw new Error(`OCR results are not valid: ${text}`);
      }
      return text;
    },
    3,
    2000,
    "OCR results",
  );
};

const readExistingCourseRows = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  semester: string,
): Promise<CourseSnapshot[]> => {
  const rows: CourseSnapshot[] = [];

  for (let offset = 0; ; offset += CHANGE_LOG_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("courses")
      .select(CHANGE_LOG_SELECT)
      .eq("semester", semester)
      .order("raw_id", { ascending: true })
      .range(offset, offset + CHANGE_LOG_PAGE_SIZE - 1);

    if (error)
      throw new Error(`Failed to read previous courses: ${error.message}`);

    rows.push(...((data ?? []) as unknown as CourseSnapshot[]));
    if (!data || data.length < CHANGE_LOG_PAGE_SIZE) break;
  }

  return rows;
};

const readPreviouslyRemovedIds = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  semester: string,
): Promise<Set<string>> => {
  const latestKindById = new Map<string, string>();

  for (let page = 0; page < CHANGE_LOG_MAX_PAGES; page++) {
    const offset = page * CHANGE_LOG_PAGE_SIZE;
    const { data, error } = await supabase
      .from("course_changes")
      .select("raw_id, kind, detected_at")
      .eq("semester", semester)
      .in("kind", ["removed", "reappeared"])
      .order("detected_at", { ascending: false })
      .range(offset, offset + CHANGE_LOG_PAGE_SIZE - 1);

    if (error)
      throw new Error(
        `Failed to read previous course changes: ${error.message}`,
      );

    for (const row of data ?? []) {
      if (!latestKindById.has(row.raw_id)) {
        latestKindById.set(row.raw_id, row.kind);
      }
    }
    if (!data || data.length < CHANGE_LOG_PAGE_SIZE) break;

    if (page === CHANGE_LOG_MAX_PAGES - 1) {
      console.warn(
        `Course change history lookup reached the ${CHANGE_LOG_MAX_PAGES}-page cap for ${semester}`,
      );
    }
  }

  return new Set(
    [...latestKindById]
      .filter(([, kind]) => kind === "removed")
      .map(([rawId]) => rawId),
  );
};

const recordCourseChanges = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  semester: string,
  currentRows: Course[],
  detectedAt: string,
): Promise<void> => {
  const previousRows = await readExistingCourseRows(supabase, semester);
  if (previousRows.length === 0) return;

  const previouslyRemovedIds = await readPreviouslyRemovedIds(
    supabase,
    semester,
  );
  const activePreviousRows = previousRows.filter(
    (course) => !previouslyRemovedIds.has(course.raw_id),
  );

  if (!isCompleteCourseSnapshot(activePreviousRows, currentRows)) {
    console.warn(
      `Skipping course removals for ${semester}: current snapshot has ${currentRows.length} rows, previous snapshot had ${activePreviousRows.length}`,
    );
  }

  const changes = diffCourseRows(
    activePreviousRows,
    currentRows as unknown as CourseSnapshot[],
    { previouslyRemovedIds },
  );
  for (
    let offset = 0;
    offset < changes.length;
    offset += CHANGE_LOG_INSERT_CHUNK_SIZE
  ) {
    const chunk = changes
      .slice(offset, offset + CHANGE_LOG_INSERT_CHUNK_SIZE)
      .map((change) => ({ ...change, detected_at: detectedAt }));
    const { error } = await supabase.from("course_changes").insert(chunk);
    if (error) {
      console.error(
        `Failed to insert course change log chunk ${Math.floor(offset / CHANGE_LOG_INSERT_CHUNK_SIZE) + 1}:`,
        error,
      );
    }
  }
};

class CourseChangeLogTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Course change logging timed out after ${timeoutMs}ms`);
    this.name = "CourseChangeLogTimeoutError";
  }
}

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new CourseChangeLogTimeoutError(timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

export interface CourseSyncOptions {
  changeLogTimeoutMs?: number;
}

const upsertCourses = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  normalizedCourses: Course[],
): Promise<void> => {
  // Update supabase with retry logic - split array into chunks of 500
  const chunked = normalizedCourses.reduce((acc, cur, i) => {
    const index = Math.floor(i / 500);
    acc[index] = acc[index] || [];
    acc[index].push(cur);
    return acc;
  }, [] as Course[][]);

  let successfulChunks = 0;
  for (const chunk of chunked) {
    try {
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.from("courses").upsert(chunk);
          if (error) throw new Error(`Supabase error: ${error.message}`);
        },
        3,
        2000,
        `database chunk ${successfulChunks + 1}/${chunked.length}`,
      );
      successfulChunks++;
    } catch (error) {
      console.error(
        `Failed to upsert chunk ${successfulChunks + 1}/${chunked.length}:`,
        error,
      );
      // Continue with other chunks instead of failing completely
    }
  }

  console.log(
    `Successfully saved ${successfulChunks}/${chunked.length} chunks to database`,
  );
};

export const syncCourseRows = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  semester: string,
  normalizedCourses: Course[],
  options: CourseSyncOptions = {},
): Promise<void> => {
  const timeoutMs = options.changeLogTimeoutMs ?? COURSE_CHANGE_LOG_TIMEOUT_MS;
  const detectedAt = new Date().toISOString();
  try {
    await withTimeout(
      recordCourseChanges(supabase, semester, normalizedCourses, detectedAt),
      timeoutMs,
    );
  } catch (error) {
    if (error instanceof CourseChangeLogTimeoutError) {
      console.warn(`${error.message}; continuing with the course upsert`);
    } else {
      console.error(
        "Course change logging failed; continuing with the course upsert:",
        error,
      );
    }
  }

  await upsertCourses(supabase, normalizedCourses);
};

/**
 * Scrape archived courses from CCXP system
 */
export const scrapeArchivedCourses = async (
  env: SyncEnvironment,
  semester: string,
  options: { skipIfEmpty?: boolean } = {},
): Promise<Course[]> => {
  // Fetch landing page with retry
  const landingPageRes = await retryWithBackoff(
    async () => {
      const response = await fetch(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php",
        { headers: { "User-Agent": SCRAPER_USER_AGENT } },
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response
        .arrayBuffer()
        .then((arrayBuffer) =>
          new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
        );
    },
    3,
    1000,
    "landing page",
  );

  // search for the ACIXSTORE
  const acixStoreRegex = /auth_img\.php\?ACIXSTORE=([a-zA-Z0-9]+)/;
  const acixStoreMatch = acixStoreRegex.exec(landingPageRes);
  if (!acixStoreMatch) {
    throw new Error("ACIXSTORE not found in landing page");
  }
  const acixStore = acixStoreMatch[1];
  // Fetch OCR results with retry
  const ocrResults = await fetchOcrResult(acixStore);
  const webLanding = parseHTML(landingPageRes).document;

  // Extract department options from the select element
  const selectElement = webLanding.querySelector('select[name="cou_code"]');
  const optionElements = (selectElement?.querySelectorAll("option") ||
    []) as HTMLOptionElement[];

  let departments: Department[] = [];

  console.log(`Found select element: ${!!selectElement}`);
  console.log(`Found ${optionElements.length} option elements`);

  optionElements.forEach((option, index) => {
    const value = option.getAttribute("value");
    const text = option.textContent?.trim();

    // Skip empty values or the first instructional option
    if (
      !value ||
      value === "" ||
      text?.startsWith("開課代號") ||
      text?.includes("請選擇開課代號")
    ) {
      return;
    }

    // Parse the department code and name
    const code = value.trim();

    // Extract Chinese and English names from the text
    if (text) {
      // Split by full-width space (　)
      const parts = text.split("　");

      if (parts.length >= 2) {
        // First part should be the code, second part contains names
        const namesPart = parts[1].trim();

        // Split names part by regular space to separate Chinese and English
        const nameWords = namesPart.split(/\s+/);
        const chineseName = nameWords[0] || "";
        const englishName = nameWords.slice(1).join(" ") || "";

        departments.push({
          code: code,
          name_zh: chineseName,
          name_en: englishName,
        });
      } else {
        // Fallback: if no full-width space, try to parse differently
        const spaceIndex = text.indexOf(" ");
        if (spaceIndex > 0) {
          const chinesePart = text.substring(0, spaceIndex);
          const englishPart = text.substring(spaceIndex + 1).trim();

          departments.push({
            code: code,
            name_zh: chinesePart.replace(code, "").trim(),
            name_en: englishPart,
          });
        } else {
          // Last fallback: just use the text as Chinese name
          departments.push({
            code: code,
            name_zh: text.replace(code, "").trim(),
            name_en: "",
          });
        }
      }
    }
  });

  const skippedDepartments = new Set(["X", "XA", "XZ", "YZ"]);
  // Filter out departments that are in the skipped list
  departments = departments.filter(
    (department) => !skippedDepartments.has(department.code.trim()),
  );

  console.log(`Found ${departments.length} departments`);

  const fetchCourses = async (
    department: Department,
    yearSemester: string,
  ): Promise<string> => {
    return await retryWithBackoff(
      async () => {
        const response = await fetch(baseUrl, {
          headers: { "User-Agent": SCRAPER_USER_AGENT },
          body: new URLSearchParams({
            "cache-control": "max-age=0",
            ACIXSTORE: `${acixStore}`,
            YS: `${yearSemester.slice(0, 3)}|${yearSemester.slice(3, 5)}`,
            cond: "a",
            cou_code: `${department.code}`,
            auth_num: `${ocrResults}`,
          }),
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response
          .arrayBuffer()
          .then((arrayBuffer) =>
            new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
          );
      },
      3,
      1500,
      `${department.code} courses`,
    );
  };

  let probedDepartment: { code: string; html: string } | undefined;
  if (options.skipIfEmpty && departments.length > 0) {
    const department = departments[0]!;
    const html = await fetchCourses(department, semester);
    if (shouldSkipUpcomingSemesterScrape(html)) {
      console.log(
        `⏭️ CCXP probe found no ${semester} courses in ${department.code}`,
      );
      return [];
    }
    probedDepartment = { code: department.code, html };
  }

  const normalizedCourses: Course[] = [];
  const failedDepartments: string[] = [];
  let successfulDepartments = 0;

  // Process departments sequentially with some concurrency control
  const concurrentBatches = 3; // Process 3 departments at a time
  for (let i = 0; i < departments.length; i += concurrentBatches) {
    const batch = departments.slice(i, i + concurrentBatches);
    const batchPromises = batch.map(async (department) => {
      try {
        console.log(`Scraping ${department.code} ${semester}...`);

        const text =
          department.code === probedDepartment?.code
            ? probedDepartment.html
            : await fetchCourses(department, semester);

        const doc = parseHTML(text).document;
        const tables = doc.querySelectorAll("table");
        const table = Array.from(tables).find((n) =>
          (n.textContent?.trim() ?? "").startsWith("科號"),
        ) as HTMLTableElement | undefined;

        const rows = Array.from(table?.querySelectorAll("tr") ?? []);
        const departmentCourses: Course[] = [];

        for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 2) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll("td") as HTMLTableCellElement[];

          const course_id = cells[0].textContent?.trim() ?? "";
          if (course_id === "") {
            continue;
          }

          // Check if the course is already added
          if (
            normalizedCourses.some((course: any) => course.raw_id === course_id)
          ) {
            continue;
          }

          const course_name = cells[1].innerHTML
            .split("<br>")
            .map((text) => text.trim());
          const course_name_zh = course_name[0];
          const course_name_en = course_name[1];
          const course_ge_type = course_name[2];

          const credit = cells[2].textContent?.trim() ?? "0";

          const time: string[] = [];
          if (cells[3].textContent?.trim()) {
            time.push(cells[3].textContent?.trim());
          }

          const venues: string[] = [];
          if (cells[4].textContent?.split("／")[0].trim()) {
            venues.push(cells[4].textContent?.split("／")[0].trim());
          }

          const teacher_en: string[] = [];
          const teacher_zh: string[] = [];
          const teacher_names = cells[5].innerHTML.split("<br>").map((text) =>
            text
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/&#160;/gi, " ")
              .trim(),
          );

          teacher_names.forEach((name, index) => {
            if (index % 2 === 0) {
              teacher_zh.push(name);
            } else {
              teacher_en.push(name);
            }
          });

          let reserve = 0;
          const size_limit = cells[6].textContent?.trim() ?? "";
          if (size_limit.includes("新生保留")) {
            reserve = Number.parseInt(
              size_limit.split("新生保留")[1].replace("人", ""),
              10,
            );
          }

          const note = cells[7].textContent?.trim() ?? "";
          const normalizedNote = fullWidthToHalfWidth(note);

          let course_restriction = "";
          const cross_discipline: string[] = [];
          const first_specialty: string[] = [];
          const second_specialty: string[] = [];
          let remark = "";

          const note_html = cells[7].innerHTML.split("<br>");

          note_html.forEach((text) => {
            if (text.includes('<font color="black">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/&#160;/gi, " ")
                .trim();

              course_restriction = cleanedText;
            } else if (text.includes('<font color="blue">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/&#160;/gi, " ")
                .trim();

              cleanedText.split("/").forEach((text) => {
                cross_discipline.push(text.replace("(跨領域)", ""));
              });
            } else if (text.includes('<font color="#5F04B4">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/&#160;/gi, " ")
                .trim();

              cleanedText.split("/").forEach((text) => {
                if (text.includes("(第一專長)")) {
                  first_specialty.push(text.replace("(第一專長)", ""));
                } else if (text.includes("(第二專長)")) {
                  second_specialty.push(text.replace("(第二專長)", ""));
                }
              });
            } else if (text.includes('<font color="#0404B4">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .replace(/&#160;/gi, " ")
                .trim();
              // replace empty string case to be ' ' so that it will be exactly
              // the same as sync-courses function
              if (cleanedText !== "") remark = cleanedText;
              else remark = " ";
            }
          });

          const tags = [];
          let weeks = 0;
          if (normalizedNote.includes("16")) {
            weeks = 16;
          } else if (normalizedNote.includes("18")) {
            weeks = 18;
          }
          if (weeks !== 0) tags.push(weeks + "週");

          const hasXClass = normalizedNote.includes("X-Class");
          if (hasXClass) tags.push("X-Class");
          const no_extra_selection = normalizedNote.includes(
            "《不接受加簽 No extra selection》",
          );
          if (no_extra_selection) tags.push("不可加簽");

          const enrollment = cells[8].textContent?.trim() ?? "";

          // replace empty string case to be ' ' so that it will be exactly
          // the same as sync-courses function
          let object = cells[9].textContent?.trim();
          if (object === "") {
            object = " ";
          }

          const comp: string[] = [];
          const elect: string[] = [];

          const required_optional_note_cell = (
            rows[rowIndex + 1].querySelectorAll("td")[0] as HTMLTableCellElement
          ).textContent
            ?.trim()
            .replace("/", "");
          const required_optional_note = required_optional_note_cell
            ?.split(",")
            .filter((text) => text.trim() !== "");

          required_optional_note?.forEach((note) => {
            if (note.includes("必修")) {
              comp.push(note.replace("必修", "").trim());
            } else {
              elect.push(note.replace("選修", "").trim());
            }
          });

          const prerequisites = cells[10].textContent?.trim() ?? "";

          const normalizedCourse = {
            capacity: Number.parseInt(size_limit, 10),
            course: course_id.slice(9, 13),
            department: course_id.slice(5, 9).trim(),
            semester: course_id.slice(0, 5),
            class: Number.parseInt(course_id.slice(13, 15), 10).toString(),
            name_en: course_name_en,
            name_zh: course_name_zh,
            teacher_en: teacher_en,
            teacher_zh: teacher_zh,
            credits: Number.parseInt(credit, 10),
            reserve: reserve,
            ge_type: course_ge_type,
            ge_target: object,
            language: note.includes("/Offered in English") ? "英" : "中",
            compulsory_for: comp,
            elective_for: elect,
            venues: venues,
            times: time,
            first_specialization: first_specialty,
            second_specialization: second_specialty,
            cross_discipline: cross_discipline,
            tags: tags,
            no_extra_selection: note.includes(
              "《不接受加簽 No extra selection》",
            ),
            note: remark,
            closed_mark: "",
            prerequisites: prerequisites,
            restrictions: course_restriction,
            raw_id: course_id,
            enrolled: Number.parseInt(enrollment, 10) ?? 0,
            updated_at: new Date().toISOString(),
          } satisfies Course;
          departmentCourses.push(normalizedCourse);
        }

        // Add successful department courses to the main array
        normalizedCourses.push(...departmentCourses);
        successfulDepartments++;
        console.log(
          `Successfully scraped ${departmentCourses.length} courses from ${department.code}`,
        );
      } catch (error) {
        console.error(`Failed to scrape department ${department.code}:`, error);
        failedDepartments.push(department.code);
        // Continue processing other departments
      }
    });

    await Promise.allSettled(batchPromises);
    console.log(
      `Completed batch ${Math.floor(i / concurrentBatches) + 1}/${Math.ceil(departments.length / concurrentBatches)}`,
    );
  }

  console.log(
    `Successfully scraped ${successfulDepartments}/${departments.length} departments`,
  );
  if (failedDepartments.length > 0) {
    console.warn(`Failed departments: ${failedDepartments.join(", ")}`);
  }
  if (failedDepartments.length === departments.length) {
    throw new Error(`All CCXP department requests failed for ${semester}`);
  }
  console.log(`Found ${normalizedCourses.length} courses in ${semester}`);

  if (options.skipIfEmpty && normalizedCourses.length === 0) {
    return normalizedCourses;
  }

  const supabase = createSupabaseClient(env);
  await syncCourseRows(supabase, semester, normalizedCourses);

  return normalizedCourses;
};

/**
 * Get anonymous ACIX store value
 */
const getAnonACIX = async (): Promise<string> => {
  return await retryWithBackoff(
    async () => {
      const url =
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.6/JH626001.php";
      const response = await fetch(url, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
        redirect: "manual",
      });
      const location = response.headers.get("location");
      const ACIXSTORE = location?.split("=")[1];

      if (!ACIXSTORE) {
        throw new Error("ACIXSTORE not found in redirect location");
      }

      return ACIXSTORE;
    },
    3,
    1000,
    "anonymous ACIX",
  );
};

/**
 * Download PDF from URL and upload to storage
 */
const downloadPDF = async (
  env: SyncEnvironment,
  url: string,
  c_key: string,
): Promise<void> => {
  try {
    const file = await retryWithBackoff(
      async () => {
        const response = await fetch(url, {
          headers: { "User-Agent": SCRAPER_USER_AGENT },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      3,
      2000,
      `PDF download ${c_key}`,
    );

    const supabase = createSupabaseClient(env);
    await retryWithBackoff(
      async () => {
        const { error } = await supabase.storage
          .from("syllabus")
          .upload(c_key + ".pdf", file, {
            cacheControl: (60 * 60 * 24 * 30).toString(), // cache the file for 30days
            upsert: true,
            contentType: "application/pdf",
          });
        if (error) throw new Error(`Storage error: ${error.message}`);
      },
      3,
      1500,
      `PDF upload ${c_key}`,
    );

    console.log(`Successfully uploaded PDF for ${c_key}`);
  } catch (error) {
    console.error(`Failed to download/upload PDF for ${c_key}:`, error);
  }
};

/**
 * Parse content from syllabus HTML
 */
const parseContent = async (
  env: SyncEnvironment,
  html: string,
  c_key: string,
) => {
  console.log("parsing " + c_key);
  const doc = parseHTML(html).document;
  const brief = doc
    .querySelectorAll("table")[4]
    ?.querySelector(".class2")?.textContent;
  const keywords = doc.querySelector("p")?.textContent;
  let content = null;
  if (
    doc
      .querySelectorAll("table")[5]
      ?.querySelector(".class2")
      ?.textContent?.includes("觀看上傳之檔案(.pdf)")
  ) {
    const url =
      "https://www.ccxp.nthu.edu.tw" +
      doc
        .querySelectorAll("table")[5]
        ?.querySelector(".class2 a")
        ?.getAttribute("href");
    await downloadPDF(env, url, c_key);
  } else {
    content = doc
      .querySelectorAll("table")[5]
      ?.querySelector(".class2")?.textContent;
  }

  return { brief, keywords, content };
};

/**
 * Scrape syllabus data for courses
 */
export const scrapeSyllabus = async (
  env: SyncEnvironment,
  semester: string,
  cachedCourses?: Course[],
): Promise<void> => {
  const fetchCourses = async () => {
    return await retryWithBackoff(
      async () => {
        const supabase = createSupabaseClient(env);
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("semester", semester)
          .order("raw_id", { ascending: true });
        if (error) throw new Error(`Supabase error: ${error.message}`);
        return data;
      },
      3,
      2000,
      "course fetch",
    );
  };

  const ACIXSTORE = await getAnonACIX();
  const baseURL = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/common/Syllabus/1.php?ACIXSTORE=${ACIXSTORE}&c_key=`;

  const fetchSyllabusHTML = async (c_key: string) => {
    return await retryWithBackoff(
      async () => {
        const response = await fetch(baseURL + encodeURIComponent(c_key), {
          headers: { "User-Agent": SCRAPER_USER_AGENT },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return new TextDecoder("big5").decode(new Uint8Array(arrayBuffer));
      },
      3,
      1500,
      `syllabus HTML ${c_key}`,
    ).catch((error) => {
      console.error(
        `Failed to fetch syllabus for ${c_key} after retries:`,
        error,
      );
      return ""; // Return empty string to continue processing other courses
    });
  };

  const courses = cachedCourses ?? (await fetchCourses());
  let processedCount = 0;
  let failedCount = 0;

  const processCourse = async (course: any) => {
    const { raw_id } = course;
    // skip YZ courses
    if (raw_id.slice(5, 7) === "YZ") return;

    try {
      const html = await fetchSyllabusHTML(raw_id);
      if (!html) {
        failedCount++;
        return; // Skip if HTML fetch failed
      }

      const {
        brief: _brief,
        keywords,
        content: _content,
      } = await parseContent(env, html, raw_id);

      // sanitize brief and content to remove all <x> instances
      const brief = _brief?.replace(/<[^>]*>/g, "").trim() || null;
      const content = _content?.replace(/<[^>]*>/g, "").trim() || null;

      const supabase = createSupabaseClient(env);
      await retryWithBackoff(
        async () => {
          const { error } = await supabase.from("course_syllabus").upsert({
            raw_id,
            brief,
            keywords: keywords?.split(",") ?? [],
            content,
            has_file: content === null,
            updated_at: new Date().toISOString(),
          });

          if (error) throw new Error(`Supabase error: ${error.message}`);
        },
        3,
        1000,
        `syllabus upsert ${raw_id}`,
      );

      processedCount++;
      console.log(`Scraped ${raw_id} (${processedCount}/${courses.length})`);
    } catch (error) {
      console.error(`Failed to process course ${raw_id}:`, error);
      failedCount++;
    }
  };

  // Process courses with concurrency limit and better error handling
  const concurrencyLimit = 30; // Reduced from 50 to be more conservative
  for (let i = 0; i < courses.length; i += concurrencyLimit) {
    const batch = courses.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map((course) => processCourse(course));
    await Promise.allSettled(batchPromises);

    console.log(
      `Completed batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(courses.length / concurrencyLimit)}`,
    );

    // Add a small delay between batches to avoid overwhelming the server
    if (i + concurrencyLimit < courses.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(
    `Scraped syllabus for ${processedCount}/${courses.length} courses in semester ${semester}`,
  );
  if (failedCount > 0) {
    console.warn(`Failed to process ${failedCount} courses`);
  }
};
