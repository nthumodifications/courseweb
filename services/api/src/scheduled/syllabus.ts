import { parseHTML } from "linkedom/worker";
import { fullWidthToHalfWidth } from "../utils/characters";
import supabase_server, { supabaseWithEnv } from "../config/supabase_server";
import type { Context } from "hono";
import algolia, { algoliaWithEnv } from "../config/algolia";

// Utility function for retry with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 6,
  baseDelay: number = 1000,
  identifier?: string,
): Promise<T> => {
  let lastError: Error = new Error("Unknown error occurred");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        const errorMsg = identifier
          ? `Final attempt failed for ${identifier}: ${lastError.message}`
          : `Final attempt failed: ${lastError.message}`;
        console.error(errorMsg);
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
      const retryMsg = identifier
        ? `Attempt ${attempt + 1} failed for ${identifier}, retrying in ${Math.round(delay)}ms: ${lastError.message}`
        : `Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`;
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

export const scrapeArchivedCourses = async (env: Env, semester: string) => {
  // Fetch landing page with retry
  const landingPageRes = await retryWithBackoff(
    async () => {
      const response = await fetch(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php",
        { cf: { cacheTtl: 0 } },
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
  const ocrResults = await retryWithBackoff(
    async () => {
      const response = await fetch(
        `https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/mod/auth_img/auth_img.php?ACIXSTORE=${acixStore}&d=3`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
  const webLanding = parseHTML(landingPageRes).document;

  // Extract department options from the select element
  const selectElement = webLanding.querySelector('select[name="cou_code"]');
  const optionElements = selectElement?.querySelectorAll("option") || [];

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

  const skippedDepartments = ["X", "XA", "XZ", "YZ"];
  // Filter out departments that are in the skipped list
  departments = departments.filter(
    (department) => !skippedDepartments.includes(department.code.trim()),
  );

  console.log(`Found ${departments.length} departments`);

  const fetchCourses = async (department: Department, yearSemester: string) => {
    return await retryWithBackoff(
      async () => {
        const response = await fetch(baseUrl, {
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
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

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
          .then((arrayBuffer) =>
            new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
          );

        const doc = parseHTML(text).document;
        const table = Array.from(doc.querySelectorAll("table")).find((n) =>
          (n.textContent?.trim() ?? "").startsWith("科號"),
        );

        const rows = Array.from(table?.querySelectorAll("tr") ?? []);
        const departmentCourses: Course[] = [];

        for (let rowIndex = 2; rowIndex < rows.length; rowIndex += 2) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll("td");

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
            reserve = parseInt(
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

          const required_optional_note_cell = rows[rowIndex + 1]
            .querySelectorAll("td")[0]
            .textContent?.trim()
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
            capacity: parseInt(size_limit),
            course: course_id.slice(9, 13),
            department: course_id.slice(5, 9).trim(),
            semester: course_id.slice(0, 5),
            class: parseInt(course_id.slice(13, 15)).toString(),
            name_en: course_name_en,
            name_zh: course_name_zh,
            teacher_en: teacher_en,
            teacher_zh: teacher_zh,
            credits: parseInt(credit),
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
            enrolled: parseInt(enrollment) ?? 0,
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
        const response = await fetch(url, { cf: { cacheTtl: 0 } });
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
  } catch (error) {
    console.error(`Failed to download/upload PDF for ${c_key}:`, error);
  }
};

const parseContent = async (env: Env, html: string, c_key: string) => {
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
    downloadPDF(env, url, c_key);
  } else {
    content = doc
      .querySelectorAll("table")[5]
      ?.querySelector(".class2")?.textContent;
  }

  return { brief, keywords, content };
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
        const response = await fetch(baseURL + encodeURIComponent(c_key));
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

      if (cachedCourses) {
        // sync to algolia as well with retry
        const algoliaCourse = {
          ...course,
          brief,
          keywords: keywords?.split(",") ?? [],
          content,
          objectID: raw_id,
          for_class: [
            ...(course.elective_for || []),
            ...(course.compulsory_for || []),
          ],
          separate_times: course.times.flatMap((s: string) =>
            s.match(/.{1,2}/g),
          ),
          courseLevel: course.course[0] + "000",
        };

        await retryWithBackoff(
          async () => {
            await algoliaWithEnv(
              env.ALGOLIA_APP_ID,
              env.ALGOLIA_API_KEY,
            ).saveObject(algoliaCourse);
          },
          2,
          1000,
          `algolia sync ${raw_id}`,
        ).catch((error) => {
          console.error(`Failed to sync ${raw_id} to Algolia:`, error);
          // Don't fail the entire process for Algolia sync failures
        });
      }

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

export const syncCoursesToAlgolia = async (env: Env, semester: string) => {
  const query = await retryWithBackoff(
    async () => {
      const { data, error } = await supabaseWithEnv(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      )
        .from("courses")
        .select("*, course_syllabus(brief, keywords)")
        .eq("semester", semester);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      if (!data) throw new Error("No data found");
      return data;
    },
    3,
    2000,
    "course data fetch for Algolia sync",
  );

  const chunked = query
    .map((m) => ({ ...m, ...m.course_syllabus }))
    .reduce((acc, cur, i) => {
      const index = Math.floor(i / 500);
      acc[index] = acc[index] || [];
      acc[index].push(cur as Course);
      return acc;
    }, [] as Course[][]);

  let successfulChunks = 0;
  for (const chunk of chunked) {
    try {
      const algoliaChunk = chunk.map(
        ({ elective_for, compulsory_for, ...course }) => ({
          ...course,
          for_class: [...(elective_for || []), ...(compulsory_for || [])],
          objectID: course.raw_id,
          separate_times: course.times.flatMap((s) => s.match(/.{1,2}/g)),
          courseLevel: course.course[0] + "000",
        }),
      );

      await retryWithBackoff(
        async () => {
          const { taskIDs } = await algoliaWithEnv(
            env.ALGOLIA_APP_ID,
            env.ALGOLIA_API_KEY,
          ).saveObjects(algoliaChunk);
          console.log(
            `Saved ${algoliaChunk.length} courses to Algolia, taskID: ${taskIDs}`,
          );
        },
        3,
        2000,
        `Algolia chunk ${successfulChunks + 1}/${chunked.length}`,
      );

      successfulChunks++;
    } catch (error) {
      console.error(
        `Error saving chunk ${successfulChunks + 1}/${chunked.length} to Algolia:`,
        error,
      );
      // Continue with other chunks instead of failing completely
    }
  }

  console.log(
    `Synced ${successfulChunks}/${chunked.length} chunks (${query.length} courses total) to Algolia for semester ${semester}`,
  );
};

export const exportCoursesToAlgoliaFile = async (
  env: Env,
  semester: string,
) => {
  console.log(`Starting Algolia data export for semester ${semester}...`);

  const query = await retryWithBackoff(
    async () => {
      const { data, error } = await supabaseWithEnv(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      )
        .from("courses")
        .select("*, course_syllabus(brief, keywords)")
        .eq("semester", semester);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      if (!data) throw new Error("No data found");
      return data;
    },
    3,
    2000,
    "course data fetch for Algolia export",
  );

  // Transform data to Algolia format
  const algoliaData = query
    .map((m) => ({ ...m, ...m.course_syllabus }))
    .map(({ elective_for, compulsory_for, course_syllabus, ...course }) => ({
      ...course,
      for_class: [...(elective_for || []), ...(compulsory_for || [])],
      objectID: course.raw_id,
      separate_times: course.times.flatMap((s) => s.match(/.{1,2}/g) || []),
      courseLevel: course.course[0] + "000",
    }));

  // Create the JSON file content
  const exportData = {
    metadata: {
      semester: semester,
      exportDate: new Date().toISOString(),
      totalCourses: algoliaData.length,
      version: "1.0",
    },
    courses: algoliaData,
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const fileName = `algolia-courses-${semester}-${new Date().toISOString().split("T")[0]}.json`;

  // Upload to Supabase storage
  const uploadResult = await retryWithBackoff(
    async () => {
      const { data, error } = await supabaseWithEnv(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      )
        .storage.from("algolia-backups")
        .upload(fileName, jsonContent, {
          cacheControl: (60 * 60 * 24 * 7).toString(), // cache for 7 days
          upsert: true,
          contentType: "application/json",
        });

      if (error) throw new Error(`Storage error: ${error.message}`);
      return data;
    },
    3,
    1500,
    `Algolia backup upload ${fileName}`,
  );

  // Get the public URL
  const { data: publicUrlData } = supabaseWithEnv(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  )
    .storage.from("algolia-backups")
    .getPublicUrl(fileName);

  console.log(`Algolia export completed: ${algoliaData.length} courses`);
  console.log(`File uploaded: ${fileName}`);
  console.log(`File size: ${Math.round(jsonContent.length / 1024)}KB`);
  console.log(`Public URL: ${publicUrlData.publicUrl}`);

  return {
    success: true,
    fileName: fileName,
    publicUrl: publicUrlData.publicUrl,
    stats: {
      totalCourses: algoliaData.length,
      fileSize: jsonContent.length,
      fileSizeKB: Math.round(jsonContent.length / 1024),
    },
    storageInfo: uploadResult,
  };
};

export const uploadAlgoliaFileToStorage = async (
  env: Env,
  semester: string,
) => {
  console.log(`Creating Algolia backup for semester ${semester}...`);

  // Use the main export function which now saves directly to storage
  const result = await exportCoursesToAlgoliaFile(env, semester);

  console.log(`Successfully created Algolia backup: ${result.fileName}`);
  console.log(
    `Backup contains ${result.stats.totalCourses} courses (${result.stats.fileSizeKB}KB)`,
  );
  console.log(`Public URL: ${result.publicUrl}`);

  return result;
};

export const restoreAlgoliaFromFile = async (env: Env, fileName: string) => {
  console.log(`Starting Algolia restore from file: ${fileName}...`);

  // Download the JSON file from storage
  const fileData = await retryWithBackoff(
    async () => {
      const { data, error } = await supabaseWithEnv(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      )
        .storage.from("algolia-backups")
        .download(fileName);

      if (error) throw new Error(`Storage download error: ${error.message}`);
      if (!data) throw new Error("No file data found");

      return data;
    },
    3,
    2000,
    `Algolia backup download ${fileName}`,
  );

  // Parse the JSON content
  const jsonText = await fileData.text();
  const exportData = JSON.parse(jsonText);

  if (!exportData.courses || !Array.isArray(exportData.courses)) {
    throw new Error("Invalid file format: courses array not found");
  }

  console.log(`Loaded ${exportData.courses.length} courses from backup file`);
  console.log(`Backup metadata:`, exportData.metadata);

  // Split into chunks for Algolia upload
  const chunked = exportData.courses.reduce(
    (acc: any[][], cur: any, i: number) => {
      const index = Math.floor(i / 500);
      acc[index] = acc[index] || [];
      acc[index].push(cur);
      return acc;
    },
    [],
  );

  let successfulChunks = 0;
  let totalUploaded = 0;

  for (const chunk of chunked) {
    try {
      await retryWithBackoff(
        async () => {
          const { taskIDs } = await algoliaWithEnv(
            env.ALGOLIA_APP_ID,
            env.ALGOLIA_API_KEY,
          ).saveObjects(chunk);
          console.log(
            `Restored ${chunk.length} courses to Algolia, taskID: ${taskIDs}`,
          );
        },
        3,
        2000,
        `Algolia restore chunk ${successfulChunks + 1}/${chunked.length}`,
      );

      successfulChunks++;
      totalUploaded += chunk.length;
    } catch (error) {
      console.error(
        `Error restoring chunk ${successfulChunks + 1}/${chunked.length} to Algolia:`,
        error,
      );
      // Continue with other chunks instead of failing completely
    }
  }

  console.log(
    `Algolia restore completed: ${totalUploaded}/${exportData.courses.length} courses restored`,
  );
  console.log(
    `Successfully processed ${successfulChunks}/${chunked.length} chunks`,
  );

  return {
    success: true,
    totalCourses: exportData.courses.length,
    coursesRestored: totalUploaded,
    chunksProcessed: successfulChunks,
    totalChunks: chunked.length,
    metadata: exportData.metadata,
  };
};

export const listAlgoliaBackups = async (env: Env) => {
  console.log("Listing available Algolia backup files...");

  const { data, error } = await supabaseWithEnv(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  )
    .storage.from("algolia-backups")
    .list();

  if (error) {
    throw new Error(`Storage list error: ${error.message}`);
  }

  const backups =
    data
      ?.filter(
        (file) =>
          file.name.endsWith(".json") && file.name.includes("algolia-backup"),
      )
      ?.map((file) => ({
        name: file.name,
        size: file.metadata?.size || 0,
        lastModified: file.updated_at,
        sizeKB: Math.round((file.metadata?.size || 0) / 1024),
      }))
      ?.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      ) || [];

  console.log(`Found ${backups.length} Algolia backup files`);
  return backups;
};
