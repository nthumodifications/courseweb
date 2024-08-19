import supabase_server from "@/config/supabase_server";
import { fullWidthToHalfWidth } from "@/helpers/characters";
import { Database } from "@/types/supabase";
import { decode } from "html-entities";
import { NextRequest, NextResponse } from "next/server";

const baseUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json`;

type APIResponse = {
  科號: string;
  課程中文名稱: string;
  課程英文名稱: string;
  學分數: string;
  人限: string;
  新生保留人數: string;
  通識對象: string;
  通識類別: string;
  授課語言: string;
  備註: string;
  停開註記: string;
  教室與上課時間: string;
  授課教師: string;
  擋修說明: string;
  課程限制說明: string;
  第一二專長對應: string;
  學分學程對應: string;
  不可加簽說明: string;
  必選修說明: string;
}[];

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV == "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const fetchCourses = async () => {
    const response = await fetch(baseUrl, { cache: "no-cache" });
    const data = (await response.json()) as APIResponse;
    return data;
  };
  const courses = await fetchCourses();

  const normalizedCourses: Database["public"]["Tables"]["courses"]["Insert"][] =
    [];
  for (const course of courses) {
    const comp: string[] = [];
    const elect: string[] = [];
    course.必選修說明
      .split("\t")
      .slice(0, -1)
      .filter((text) => text.trim() !== "")
      .map((code) => {
        const code_ = code.replace("  ", " ");
        const [classs, type] = code_.split(" ");
        // console.log(classs, type)
        if (classs == undefined || type == undefined)
          throw new Error("fformat error");
        if (type.trim().trimStart() === "必修") comp.push(classs);
        else elect.push(classs);
      });

    const venues: string[] = [];
    const times: string[] = [];
    fullWidthToHalfWidth(course.教室與上課時間)
      .split("\n")
      .filter((text) => text.trim() !== "")
      .map((code) => {
        const [venue, time] = code.split("\t");
        venues.push(venue);
        times.push(time);
      });

    const first_specialty: string[] = [];
    const second_specialty: string[] = [];

    course["第一二專長對應"]
      .split("\t")
      .filter((text) => text.trim() !== "")
      .forEach((text) => {
        if (text.endsWith("(第二專長)")) {
          second_specialty.push(text.replace("(第二專長)", ""));
        } else if (text.endsWith("(第一專長)")) {
          first_specialty.push(text.replace("(第一專長)", ""));
        } else {
          throw "sumting wong";
        }
      });
    const tags = [];
    const normalizedNote = fullWidthToHalfWidth(course["備註"]);
    const weeks = normalizedNote.includes("16")
      ? 16
      : normalizedNote.includes("18")
        ? 18
        : 0;
    if (weeks != 0) tags.push(weeks + "週");
    const hasXClass = normalizedNote.includes("X-Class") ? true : false;
    if (hasXClass) tags.push("X-Class");
    const no_extra_selection = course["不可加簽說明"].includes(
      "《不接受加簽 No extra selection》",
    );
    if (no_extra_selection) tags.push("不可加簽");

    const cross_discipline: string[] = [];
    course["學分學程對應"]
      .split("/")
      .filter((text) => text.trim() !== "")
      .forEach((text) => {
        cross_discipline.push(text.replace("(跨領域)", ""));
      });

    const teacher_en: string[] = [];
    const teacher_zh: string[] = [];
    course.授課教師
      .split("\n")
      .filter((text) => text.trim() !== "")
      .map((code) => {
        const [zh, en] = code.split("\t");
        teacher_zh.push(decode(zh));
        teacher_en.push(en);
      });
    normalizedCourses.push({
      capacity: parseInt(course["人限"]),
      course: course["科號"].slice(9, 13),
      department: course["科號"].slice(5, 9).trim(),
      semester: course["科號"].slice(0, 5),
      class: parseInt(course["科號"].slice(13, 15)).toString(),
      name_en: decode(course["課程英文名稱"]),
      name_zh: decode(course["課程中文名稱"]),
      teacher_en: teacher_en,
      teacher_zh: teacher_zh,
      credits: parseInt(course["學分數"]),
      reserve: parseInt(course["新生保留人數"]),
      ge_type: course["通識類別"],
      ge_target: course["通識對象"],
      language: course["授課語言"],
      compulsory_for: comp,
      elective_for: elect,
      venues: venues,
      times: times,
      first_specialization: first_specialty,
      second_specialization: second_specialty,
      cross_discipline: cross_discipline,
      tags: tags,
      no_extra_selection: course["不可加簽說明"].includes(
        "《不接受加簽 No extra selection》",
      ),
      note: normalizedNote,
      closed_mark: course["停開註記"],
      prerequisites: course["擋修說明"],
      restrictions: course["課程限制說明"],
      raw_id: course["科號"],
    });
  }

  // [DEBUG]: write to file
  // await writeFile('courses.json', JSON.stringify(normalizedCourses, null, 4));

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

  return NextResponse.json({ status: 200, body: { message: "success" } });
};
