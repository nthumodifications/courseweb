import supabase_server from "@/config/supabase_server";
import { fullWidthToHalfWidth } from "@/helpers/characters";
import { Database } from "@/types/supabase";
import jsdom from "jsdom";
import { Department } from "@/types/courses";
import { departments } from "@/const/departments";
import { NextResponse } from "next/server";
import algolia from "@/config/algolia_server";
import { kv } from "@vercel/kv";
import { signInToCCXP } from "@/lib/headless_ais";
const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629002.php`;

export const scrapeArchivedCourses = async (semester: string) => {
  const user = await signInToCCXP(
    process.env.DONER_STUDENTID!,
    process.env.DONER_PASSWORD!,
  );

  if ("error" in user) {
    throw new Error(user.error.message);
  }
  const { ACIXSTORE } = user;
  const fetchCourses = async (department: Department, yearSemester: string) => {
    const response = await fetch(baseUrl, {
      body: new URLSearchParams({
        "cache-control": "max-age=0",
        ACIXSTORE: `${ACIXSTORE}`,
        YS: `${yearSemester.slice(0, 3)}|${yearSemester.slice(3, 5)}`,
        cond: "a",
        cou_code: `${department.code}`,
        // auth_num: `${answer}`,
      }),
      method: "POST",
      cache: "no-cache",
    });
    return response;
  };

  const normalizedCourses: Database["public"]["Tables"]["courses"]["Insert"][] =
    [];

  await Promise.all(
    departments.map(async (department) => {
      console.log(`Scraping ${department.code} ${semester}...`);

      const text = await fetchCourses(department, semester)
        .then((res) => res.arrayBuffer())
        .then((arrayBuffer) =>
          new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
        );

      const dom = new jsdom.JSDOM(text);
      const doc = dom.window.document;

      const table = Array.from(doc.querySelectorAll("table")).find((n) =>
        (n.textContent?.trim() ?? "").startsWith("科號"),
      );

      const rows = Array.from(table?.querySelectorAll("tr") ?? []);
      for (let i = 2; i < rows.length; i += 2) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");

        const course_id = cells[0].textContent?.trim() ?? "";
        if (course_id === "") {
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
          reserve = parseInt(size_limit.split("新生保留")[1].replace("人", ""));
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
        const weeks = normalizedNote.includes("16")
          ? 16
          : normalizedNote.includes("18")
            ? 18
            : 0;
        if (weeks != 0) tags.push(weeks + "週");
        const hasXClass = normalizedNote.includes("X-Class") ? true : false;
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

        const required_optional_note_cell = rows[i + 1]
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

        //check if the course is already added
        if (normalizedCourses.find((course) => course.raw_id === course_id))
          continue;
        normalizedCourses.push({
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
        });
      }
    }),
  );

  // update supabase, check if the course with the same raw_id exists, if so, update it, otherwise insert it
  //split array into chunks of 1000

  const chunked = normalizedCourses.reduce(
    (acc, cur, i) => {
      const index = Math.floor(i / 500);
      acc[index] = acc[index] || [];
      acc[index].push(cur);
      return acc;
    },
    [] as Database["public"]["Tables"]["courses"]["Insert"][][],
  );
  for (const chunk of chunked) {
    const { error } = await supabase_server.from("courses").upsert(chunk);
    if (error) throw error;
  }
};

const downloadPDF = async (url: string, c_key: string) => {
  //get url+c_key file as a arrayBuffer
  const file = await fetch(url, { cache: "no-cache" })
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => Buffer.from(arrayBuffer));
  //save file to local fs
  // await fs.writeFileSync(c_key + '.pdf', file)
  await supabase_server.storage
    .from("syllabus")
    .upload(c_key + ".pdf", file, {
      cacheControl: (60 * 60 * 24 * 30).toString(), // cache the file for 30days
      upsert: true,
      contentType: "application/pdf",
    })
    .then((res) => {
      console.log(res);
    });
};

const parseContent = async (html: string, c_key: string) => {
  console.log("parsing " + c_key);
  const dom = new jsdom.JSDOM(html);
  const doc = dom.window.document;
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
    downloadPDF(url, c_key);
  } else {
    content = doc
      .querySelectorAll("table")[5]
      ?.querySelector(".class2")?.textContent;
  }

  return { brief, keywords, content };
};

const getAnonACIX = async () => {
  const url =
    "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.6/JH626001.php";
  //the url should return a 302 redirect to a url with ACIXSTORE as `JH626001.php?ACIXSTORE=xxxx`
  const ACIXSTORE = await fetch(url, { redirect: "manual" })
    .then((res) => res.headers.get("location"))
    .then((location) => location?.split("=")[1]);
  return ACIXSTORE;
};

export const scrapeSyllabus = async (semester: string) => {
  const fetchCourses = async () => {
    const { data, error } = await supabase_server
      .from("courses")
      .select("raw_id")
      .eq("semester", semester)
      .order("raw_id", { ascending: true });
    if (error) throw error;
    return data;
  };

  const ACIXSTORE = await getAnonACIX();

  if (ACIXSTORE === null)
    return NextResponse.json({ error: "ACIXSTORE not found" }, { status: 400 });

  const baseURL = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/common/Syllabus/1.php?ACIXSTORE=${ACIXSTORE}&c_key=`;

  const fetchSyllabusHTML = async (c_key: string) => {
    const text = await fetch(baseURL + encodeURIComponent(c_key))
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) =>
        new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
      );
    return text;
  };
  const courses = await fetchCourses();
  for (const course of courses) {
    const { raw_id } = course;
    // skip YZ courses
    if (raw_id.slice(5, 7) === "YZ") continue;
    const html = await fetchSyllabusHTML(raw_id);
    const { brief, keywords, content } = await parseContent(html, raw_id);
    console.log("scrapped", raw_id, brief);
    const { error } = await supabase_server.from("course_syllabus").upsert({
      raw_id,
      brief,
      keywords: keywords?.split(",") ?? [],
      content,
      has_file: content === null ? true : false,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }
};

export const syncCoursesToAlgolia = async (semester: string) => {
  const query = await supabase_server
    .from("courses")
    .select("*, course_syllabus(brief, keywords)")
    .eq("semester", semester);

  if (!query.data) throw new Error("no data found");

  const chunked = query.data
    .map((m) => ({ ...m, ...m.course_syllabus }))
    .reduce(
      (acc, cur, i) => {
        const index = Math.floor(i / 500);
        acc[index] = acc[index] || [];
        acc[index].push(cur);
        return acc;
      },
      [] as Database["public"]["Tables"]["courses"]["Row"][][],
    );

  for (const chunk of chunked) {
    const algoliaChunk = chunk.map(
      ({ elective_for, compulsory_for, ...course }) => ({
        ...course,
        for_class: [...(elective_for || []), ...(compulsory_for || [])],
        objectID: course.raw_id,
        separate_times: course.times.flatMap((s) => s.match(/.{1,2}/g)),
        courseLevel: course.course[0] + "000",
      }),
    );
    algolia.saveObjects(algoliaChunk);
  }

  await kv.set("COURSE_SYNCED_ON", new Date().toISOString());
};
