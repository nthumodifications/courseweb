import supabase_server from "./config/supabase_server";
import { selectMinimalStr } from "./types/courses";
import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "hono/adapter";
import { parseHTML } from "linkedom/worker";
import { parsePttPostedAt } from "./ptt";

const getContribDates = async (c: Context, courseId: string) => {
  const { data, error } = await supabase_server(c)
    .from("course_dates")
    .select("*")
    .eq("raw_id", courseId);
  if (error) {
    console.error(error);
    return null;
  } else
    return data.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      date: d.date,
    }));
};

const MAX_COURSE_IDS = 2_000;
const COURSE_QUERY_CHUNK_SIZE = 100;
const courseIdSchema = z.string().trim().min(1).max(100);
const courseListSchema = z.union([
  courseIdSchema,
  z.array(courseIdSchema).min(1).max(MAX_COURSE_IDS),
]);
const courseListQueryValidator = zValidator(
  "query",
  z.object({
    //expect courses to be string if 1 item, array if multiple
    courses: courseListSchema,
  }),
);
const courseParamValidator = zValidator(
  "param",
  z.object({
    courseId: courseIdSchema,
  }),
);
const courseChangesQueryValidator = zValidator(
  "query",
  z.object({
    semester: z.string().trim().min(1).max(20),
    days: z.coerce.number().int().min(1).max(365).default(7),
    department: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .regex(/^[A-Za-z0-9]+$/)
      .optional(),
    limit: z.coerce.number().int().min(1).max(500).default(500),
  }),
);
const courseChangeCacheControl =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

const queryInChunks = async <T>(
  ids: string[],
  query: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> => {
  const uniqueIds = [...new Set(ids)];
  const data: T[] = [];

  for (
    let start = 0;
    start < uniqueIds.length;
    start += COURSE_QUERY_CHUNK_SIZE
  ) {
    const result = await query(
      uniqueIds.slice(start, start + COURSE_QUERY_CHUNK_SIZE),
    );
    if (result.error) return { data: [], error: result.error };
    data.push(...(result.data ?? []));
  }

  return { data, error: null };
};

const app = new Hono()
  .get("/", courseListQueryValidator, async (c) => {
    const { courses: _courses } = c.req.valid("query");

    const courses = Array.isArray(_courses) ? _courses : [_courses];

    const { data, error } = await queryInChunks<any>(courses, (chunk) =>
      supabase_server(c).from("courses").select("*").in("raw_id", chunk),
    );
    if (error) {
      console.error(error);
      throw new Error("Failed to fetch course data");
    }
    return c.json(data);
  })
  .get("/changes", courseChangesQueryValidator, async (c) => {
    const { semester, days, department, limit } = c.req.valid("query");
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();
    let changesQuery = supabase_server(c)
      .from("course_changes")
      .select("*")
      .eq("semester", semester)
      .gte("detected_at", since);
    if (department) {
      const departmentPrefix =
        department.length === 4
          ? `${semester}${department}`
          : `${semester}${department} `;
      changesQuery = changesQuery.like("raw_id", `${departmentPrefix}%`);
    }
    const { data, error } = await changesQuery
      .order("detected_at", { ascending: false })
      .range(0, limit - 1);
    if (error) {
      throw new Error(error.message);
    }

    const changes = data ?? [];
    const rawIds = [...new Set(changes.map((change) => change.raw_id))];
    const courseByRawId = new Map<
      string,
      {
        raw_id: string;
        name_zh: string;
        name_en: string;
        department: string;
        course: string;
        class: string;
      }
    >();
    if (rawIds.length > 0) {
      const { data: courses, error: coursesError } = await queryInChunks<{
        raw_id: string;
        name_zh: string;
        name_en: string;
        department: string;
        course: string;
        class: string;
      }>(rawIds, (chunk) =>
        supabase_server(c)
          .from("courses")
          .select("raw_id, name_zh, name_en, department, course, class")
          .in("raw_id", chunk),
      );
      if (coursesError) {
        console.error("Failed to enrich course changes:", coursesError);
      } else {
        for (const course of courses ?? []) {
          courseByRawId.set(course.raw_id, course);
        }
      }
    }

    c.header("Cache-Control", courseChangeCacheControl);
    return c.json(
      changes.map((change) => {
        const course = courseByRawId.get(change.raw_id);
        return course ? { ...change, course } : change;
      }),
    );
  })
  .get("/dates", courseListQueryValidator, async (c) => {
    const { courses: _courses } = c.req.valid("query");
    const courses = Array.isArray(_courses) ? _courses : [_courses];
    const { data, error } = await queryInChunks<any>(courses, (chunk) =>
      supabase_server(c).from("course_dates").select("*").in("raw_id", chunk),
    );
    if (error) {
      console.error(error);
      return c.json([]);
    }
    return c.json(
      data.map((d) => ({
        raw_id: d.raw_id,
        id: d.id,
        type: d.type,
        title: d.title,
        date: d.date,
      })),
    );
  })
  .get("/:courseId/changes", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const { data, error } = await supabase_server(c)
      .from("course_changes")
      .select("*")
      .eq("raw_id", courseId)
      .order("detected_at", { ascending: false })
      .range(0, 49);
    if (error) {
      throw new Error(error.message);
    }
    c.header("Cache-Control", courseChangeCacheControl);
    return c.json(data ?? []);
  })
  .get("/:courseId", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const { data, error } = await supabase_server(c)
      .from("courses")
      .select("*")
      .eq("raw_id", courseId);
    if (error) {
      throw new Error(error.message);
    }
    return c.json(data![0]);
  })
  .get("/:courseId/syllabus", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");

    const { data, error } = await supabase_server(c)
      .from("courses")
      .select(
        `*, course_syllabus ( * ), course_scores ( * ), course_dates ( * )`,
      )
      .eq("raw_id", courseId);
    if (error) {
      throw new Error(error.message);
    }
    return c.json(data![0]);
  })
  .get("/:courseId/minimal", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const { data, error } = await supabase_server(c)
      .from("courses")
      .select(selectMinimalStr)
      .eq("raw_id", courseId);
    if (error) {
      throw new Error(error.message);
    }
    return c.json(data![0]);
  })
  .get("/:courseId/ptt", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const { data, error } = await supabase_server(c)
      .from("courses")
      .select("*")
      .eq("raw_id", courseId);
    if (error) {
      console.error(error);
      throw new Error("Failed to fetch course data");
    }
    const course = data![0];

    //TODO: use better search to find the posts
    try {
      const PTTWEBSITE = `https://www.ptt.cc/bbs/NTHU_Course/search?q=`;
      const searchTerm = encodeURI(
        `${course!.name_zh} ${course!.teacher_zh?.join(" ")}`,
      );
      const res = await fetch(`${PTTWEBSITE}${searchTerm}`);
      const html = await res.text();
      const root = parseHTML(html).document;

      const posts_link = root.querySelectorAll(".r-ent");
      const reviews = [];
      for (const post_link of posts_link) {
        const link = post_link.querySelector(".title a");
        try {
          const res = await fetch(
            `https://www.ptt.cc${link!.getAttribute("href")}`,
          );
          const html = await res.text();
          const root = parseHTML(html).document;
          const post = root.querySelector("#main-content");
          const fullContent = post!.textContent!;
          const content = fullContent
            .split("看板NTHU_Course標題")[1]
            .split("--")[0];

          const excessiveText = `===================個人想寫的公告===================
//↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
有鑑於學校目前把很多科目的成績分布都不公開處理，導致選課資訊的流通被強力阻撓，
希望大家能夠多多發文寫每科的修課心得，讓後面要修課的人得到比較透明的資訊！希望
大家多多幫忙，不管是要發Dcard或臉書的通識平台都好，或者如果你願意發表到ptt上但
苦於沒有帳號，我可以協助代PO！
需要我代PO的話，請登入google帳號後，填寫下列兩個表單其一:
一、    https://tg.pe/x3Ls (推薦版本，因為寫word檔可以存檔休息，不怕電腦突然中
斷)
二、    https://tg.pe/xQHL
我收到表單之後，應該會在一星期內貼出來。
希望大家多多參與！不管是通識課或專業科目都好，否則目前版上的文章看起來是快被電
資院的課程佔據了
//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
===================個人想寫的公告===================

`;

          const contentWithoutExcessiveText = content.replace(
            excessiveText,
            "",
          );

          const metaValues = root.querySelectorAll(".article-meta-value");
          const date = metaValues[3]?.textContent?.trim() ?? null;
          const author = metaValues[0]?.textContent?.trim() ?? null;
          const href = link!.getAttribute("href");
          const sourceUrl = href
            ? new URL(href, "https://www.ptt.cc").toString()
            : null;
          const review = {
            content: contentWithoutExcessiveText,
            date: parsePttPostedAt(date),
            sourceUrl,
            sourceAuthor: author?.split(/\s+/u)[0] ?? null,
          };
          reviews.push(review);
        } catch (error) {
          console.error(error);
        }
      }
      return c.json(reviews);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch ptt data");
    }
  })
  .get("/:courseId/related", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const { data: dataCourse, error: courseError } = await supabase_server(c)
      .from("courses")
      .select("*")
      .eq("raw_id", courseId);
    if (courseError) {
      console.error(courseError);
      throw new Error("Failed to fetch course data");
    }
    const course = dataCourse![0];
    const semester = Number.parseInt(course.semester.substring(0, 3));
    const getsemesters = [
      semester - 2,
      semester - 1,
      semester,
      semester + 1,
    ].flatMap((s) => [s.toString() + "10", s.toString() + "20"]);

    const { data, error } = await supabase_server(c)
      .from("courses")
      .select("*, course_scores(*)")
      .eq("department", course.department)
      .eq("course", course.course)
      .eq("name_zh", course.name_zh) //due to the way the course ids are arranged, this is the best way to get the same course
      .in("semester", getsemesters)
      .not("raw_id", "eq", course.raw_id)
      .order("raw_id", { ascending: false });
    if (error) throw error;
    if (!data) throw new Error("No data");
    return c.json(data);
  })
  .get("/classes", async (c) => {
    const { data, error } = await supabase_server(c)
      .from("distinct_classes")
      .select("class");
    if (error) {
      console.error(error);
      throw new Error("Failed to fetch classes");
    }
    const filteredData = data.filter((item: any) => item.class !== null) as {
      class: string;
    }[];
    return c.json(filteredData.map((item) => item.class));
  })
  .get("/:courseId/syllabus/file", courseParamValidator, (c) => {
    const { courseId } = c.req.valid("param");
    const { SUPABASE_URL } = env<{ SUPABASE_URL: string }>(c);
    return c.redirect(
      `${SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`,
    );
  })
  .get("/:courseId/dates", courseParamValidator, async (c) => {
    const { courseId } = c.req.valid("param");
    const dates = await getContribDates(c, courseId);
    return c.json(dates);
  })
  .post(
    "/:courseId/dates",
    zValidator(
      "json",
      z.object({
        dates: z.array(
          z.object({
            id: z.coerce.number().optional(),
            type: z.string(),
            title: z.string(),
            date: z.string(),
          }),
        ),
      }),
    ),
    courseParamValidator,
    async (c) => {
      return c.notFound();
      // try {
      //   const session = {
      //     uid: "test",
      //   }
      //   if (!session) throw new Error("Not logged in");
      //   // so user has course, make sure this is edited during the semester
      //   if (!currentSemester || currentSemester.id != raw_id.substring(0, 5))
      //     throw new Error("Invalid semester");

      //   //check if all dates are in yyyy-mm-dd format (We assume Taipei timezone, so no need to convert timezone)
      //   if (!dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date)))
      //     throw new Error("Invalid date format");

      //   const oldContribDates = await getContribDates(raw_id);
      //   if (!oldContribDates) throw new Error("Failed to get old dates");
      //       // Filter out old unchanged dates
      //       const newDates = dates.filter(
      //     (d) =>
      //       !oldContribDates.find(
      //         (oldd) =>
      //           oldd.type == d.type &&
      //           oldd.title == d.title &&
      //           isSameDay(new Date(oldd.date), new Date(d.date)),
      //       ),
      //   );
      //   // Check if updating id's exists in oldContribDates
      //   if (
      //     !newDates
      //       .filter((m) => m.id)
      //       .every((d) => oldContribDates.find((oldd) => oldd.id == d.id))
      //   )
      //     throw new Error("Invalid date id");
      //   if (newDates.length > 0) {
      //     const { data, error } = await supabase_server(c).from("course_dates").upsert(
      //       newDates.map((d) => ({
      //         ...(d.id ? { id: d.id } : {}),
      //         raw_id,
      //         type: d.type,
      //         title: d.title,
      //         date: d.date,
      //         submitter: session.uid,
      //       })),
      //       { onConflict: "id", defaultToNull: false },
      //     );
      //     if (error) throw new Error("Failed to update dates");

      //     await supabase_server(c).from("course_logs").insert({
      //       raw_id,
      //       action: `added ${newDates.filter((d) => !d.id).length} dates and updated ${newDates.filter((d) => d.id).length} dates`,
      //       user: session.uid,
      //     });
      //   }

      //   const missingIds = oldContribDates
      //     .filter((oldd) => !dates.find((d) => d.id == oldd.id))
      //     .map((d) => d.id);
      //   if (missingIds.length > 0) {
      //     const { data: delData, error: delError } = await supabase_server(c)
      //       .from("course_dates")
      //       .delete()
      //       .in("id", missingIds);
      //     await supabase_server(c).from("course_logs").insert({
      //       raw_id,
      //       action: `deleted ${missingIds.length} dates`,
      //       user: session.uid,
      //     });
      //     if (delError) throw new Error("Failed to delete dates");
      //   }
      //   // invalidate cache
      //   revalidatePath(`/[lang]/courses/${raw_id}`, "page");
      //   return c.status(200);
      // } catch (error) {
      //   throw error;
      // }
    },
  );

export default app;
