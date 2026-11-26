import {
  HTMLOptionElement,
  HTMLTableCellElement,
  HTMLTableElement,
  parseHTML,
} from "linkedom/worker";
import { fullWidthToHalfWidth } from "../utils/characters";
import { supabaseWithEnv } from "../config/supabase_server";
import { fetchUpstream, UpstreamHttpError } from "../utils/upstream";

export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (compatible; NTHUModsBot/1.0; +https://nthumods.com)";

// Utility function for retry with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 6,
  baseDelay: number = 1000,
  identifier?: string,
): Promise<T> => {
  let lastError: unknown = new Error("Unknown error occurred");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        const errorMsg = identifier
          ? `Final attempt failed for ${identifier}`
          : "Final attempt failed";
        console.error(errorMsg);
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
      const retryMsg = identifier
        ? `Attempt ${attempt + 1} failed for ${identifier}, retrying in ${Math.round(delay)}ms`
        : `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`;
      console.warn(retryMsg);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

interface Department {
  code: string;
  name_zh: string;
  name_en: string;
}

interface Course {
  capacity: number | null;
  course: string;
  department: string;
  semester: string;
  class: string;
  name_en: string;
  name_zh: string;
  teacher_en: string[] | null;
  teacher_zh: string[];
  credits: number;
  reserve: number;
  ge_type: string;
  ge_target?: string;
  language: string;
  compulsory_for: string[];
  elective_for: string[];
  venues: string[];
  times: string[];
  first_specialization: string[];
  second_specialization: string[];
  cross_discipline: string[];
  tags: string[];
  no_extra_selection: boolean;
  note: string;
  closed_mark: string;
  prerequisites: string;
  restrictions: string;
  raw_id: string;
  enrolled: number;
  updated_at: string;
}

const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629002.php`;

export function decodeSchoolText(bytes: ArrayBuffer): string {
  return new TextDecoder("big5").decode(new Uint8Array(bytes));
}

export const fetchOcrResult = async (acixStore: string): Promise<string> => {
  return await retryWithBackoff(
    async () => {
      try {
        const response = await fetchUpstream(
          `https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/mod/auth_img/auth_img.php?ACIXSTORE=${acixStore}&d=3`,
          { headers: { "User-Agent": SCRAPER_USER_AGENT } },
        );
        const text = await response.text();
        if (text.length !== 3) {
          throw new Error(`OCR results are not valid: ${text}`);
        }
        return text;
      } catch (error) {
        if (error instanceof UpstreamHttpError) {
          const body = await error.response.clone().text();
          throw new Error(
            `HTTP ${error.response.status}: ${error.response.statusText}; body: ${body.slice(0, 100)}`,
          );
        }
        throw error;
      }
    },
    3,
    2000,
    "OCR results",
  );
};

export const scrapeArchivedCourses = async (env: Env, semester: string) => {
  // Fetch landing page with retry
  const landingPageRes = await retryWithBackoff(
    async () => {
      const response = await fetchUpstream(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php",
        { cf: { cacheTtl: 0 } },
        { allowHtml: true },
      );
      return response
        .arrayBuffer()
        .then((arrayBuffer) => decodeSchoolText(arrayBuffer));
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
    // Based on the HTML sample, format appears to be: "CODE　Chinese Name English Name"
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

  const fetchCourses = async (department: Department, yearSemester: string) => {
    return await retryWithBackoff(
      async () => {
        const response = await fetchUpstream(
          baseUrl,
          {
            body: new URLSearchParams({
              "cache-control": "max-age=0",
              ACIXSTORE: `${acixStore}`,
              YS: `${yearSemester.slice(0, 3)}|${yearSemester.slice(3, 5)}`,
              cond: "a",
              cou_code: `${department.code}`,
              auth_num: `${ocrResults}`,
            }),
            method: "POST",
            cf: { cacheTtl: 0 },
          },
          { allowHtml: true },
        );

        return response;
      },
      3,
      1500,
      `${department.code} courses`,
    );
  };

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

        const response = await fetchCourses(department, semester);
        const text = await response
          .arrayBuffer()
          .then((arrayBuffer) => decodeSchoolText(arrayBuffer));

        const doc = parseHTML(text).document;
        const table = Array.from(
          doc.querySelectorAll("table") as HTMLTableElement[],
        ).find((n) => (n.textContent?.trim() ?? "").startsWith("科號")) as
          | HTMLTableElement
          | undefined;

        if (!table) throw new Error("Course table was not found");
        const rows = Array.from(table.querySelectorAll("tr"));
        const departmentCourses: Course[] = [];

        for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 2) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll("td") as HTMLTableCellElement[];

          if (!rows[rowIndex + 1]) {
            throw new Error(`Course row ${rowIndex} was incomplete`);
          }

          const course_id = cells[0].textContent?.trim() ?? "";
          if (course_id === "") {
            continue;
          }

          // Check if the course is already added
          if (
            normalizedCourses.find((course: any) => course.raw_id === course_id)
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
                .trim();

              course_restriction = cleanedText;
            } else if (text.includes('<font color="blue">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
                .trim();

              cleanedText.split("/").forEach((text) => {
                cross_discipline.push(text.replace("(跨領域)", ""));
              });
            } else if (text.includes('<font color="#5F04B4">')) {
              let cleanedText = text
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/gi, " ")
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
            capacity: Number.parseInt(size_limit),
            course: course_id.slice(9, 13),
            department: course_id.slice(5, 9).trim(),
            semester: course_id.slice(0, 5),
            class: Number.parseInt(course_id.slice(13, 15)).toString(),
            name_en: course_name_en,
            name_zh: course_name_zh,
            teacher_en: teacher_en,
            teacher_zh: teacher_zh,
            credits: Number.parseInt(credit),
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
            enrolled: Number.parseInt(enrollment) ?? 0,
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
  console.log(`Found ${normalizedCourses.length} courses in ${semester}`);

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
          const { error } = await supabaseWithEnv(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
          )
            .from("courses")
            .upsert(chunk);
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

  return normalizedCourses;
};

const downloadPDF = async (env: Env, url: string, c_key: string) => {
  try {
    const file = await retryWithBackoff(
      async () => {
        const response = await fetchUpstream(url, { cf: { cacheTtl: 0 } });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      3,
      2000,
      `PDF download ${c_key}`,
    );

    await retryWithBackoff(
      async () => {
        const { error } = await supabaseWithEnv(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
        )
          .storage.from("syllabus")
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
    return true;
  } catch (error) {
    console.error(`Failed to download/upload PDF for ${c_key}:`, error);
    return false;
  }
};

export function parseSyllabusMarkup(html: string): {
  brief: string | null;
  keywords: string | null;
  content: string | null;
  pdfHref: string | null;
} | null {
  const doc = parseHTML(html).document;
  const tables = doc.querySelectorAll("table");
  const briefCell = tables[4]?.querySelector(".class2");
  const contentCell = tables[5]?.querySelector(".class2");
  if (!briefCell || !contentCell) return null;
  const pdfHref = contentCell.textContent?.includes("觀看上傳之檔案(.pdf)")
    ? (contentCell.querySelector("a")?.getAttribute("href") ?? null)
    : null;
  if (contentCell.textContent?.includes("觀看上傳之檔案(.pdf)") && !pdfHref) {
    return null;
  }
  return {
    brief: briefCell.textContent,
    keywords: doc.querySelector("p")?.textContent ?? null,
    content: pdfHref ? null : contentCell.textContent,
    pdfHref,
  };
}

const parseContent = async (env: Env, html: string, c_key: string) => {
  console.log("parsing " + c_key);
  const parsed = parseSyllabusMarkup(html);
  if (!parsed) throw new Error("Syllabus table markup was not found");
  let content = parsed.content;
  if (parsed.pdfHref) {
    const url = "https://www.ccxp.nthu.edu.tw" + parsed.pdfHref;
    if (!(await downloadPDF(env, url, c_key))) {
      throw new Error("Syllabus PDF download failed");
    }
  }

  return { brief: parsed.brief, keywords: parsed.keywords, content };
};

const getAnonACIX = async () => {
  return await retryWithBackoff(
    async () => {
      const url =
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.6/JH626001.php";
      const response = await fetch(url, { redirect: "manual" });
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

export const scrapeSyllabus = async (
  env: Env,
  semester: string,
  cachedCourses?: Course[],
) => {
  const fetchCourses = async () => {
    return await retryWithBackoff(
      async () => {
        const { data, error } = await supabaseWithEnv(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
        )
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
        const response = await fetchUpstream(
          baseURL + encodeURIComponent(c_key),
          undefined,
          { allowHtml: true },
        );
        const arrayBuffer = await response.arrayBuffer();
        return decodeSchoolText(arrayBuffer);
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

      await retryWithBackoff(
        async () => {
          const { error } = await supabaseWithEnv(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
          )
            .from("course_syllabus")
            .upsert({
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
