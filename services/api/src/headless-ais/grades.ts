import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTMLDivElement, HTMLTableElement, parseHTML } from "linkedom/worker";
import { z } from "zod";
import { acixStoreSchema } from "./session-params";

const parseSafeInt = (value: string | undefined): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const parseGradesHtml = (html: string) => {
  const { document: doc } = parseHTML(html);
  const tables = Array.from(
    doc.querySelectorAll("table") as HTMLTableElement[],
  );
  const table = tables.find((candidate) =>
    (candidate.textContent?.trim() ?? "").startsWith("學號 Student Number"),
  );
  const ranking_table = tables.find((candidate) =>
    (candidate.textContent?.trim() ?? "").startsWith("以下各排名僅供參考"),
  );

  if (!table || !ranking_table) return null;

  // First row: student information.
  // Second row: total, passed, and pending credits.
  // Rows 3 through the penultimate row: course grades.
  const student_info = table.querySelector("tr")?.textContent?.trim();
  const student_info_regex =
    /學號 Student Number：(?<studentid>.+)　　姓名 Name：(?<name_zh>.+)　　班級 Department & Class：(?<class_name_zh>.+)/;
  const student_info_match = student_info?.match(student_info_regex);
  const student = {
    studentid: student_info_match?.groups?.studentid,
    name_zh: student_info_match?.groups?.name_zh,
    class_name_zh: student_info_match?.groups?.class_name_zh,
  };

  const credits_info = table
    .querySelectorAll("tr")[1]
    ?.querySelector("p")
    ?.textContent?.trim();
  const credits_info_regex =
    /修習總學分\(包含及格,不及格及成績未到\) Total credits\( including passing, failing, and not submitted grades\)：(?<total_credits>.+)　已修及格畢業學分 Passing grade：(?<passed_credits>.+)　成績未到畢業學分 Not submitted grade：(?<pending_credits>.+)/;
  const credits_info_match = credits_info?.match(credits_info_regex);
  const credits = {
    total_credits: parseSafeInt(credits_info_match?.groups?.total_credits),
    passed_credits: parseSafeInt(credits_info_match?.groups?.passed_credits),
    pending_credits: parseSafeInt(credits_info_match?.groups?.pending_credits),
  };

  const rows = table.querySelectorAll("tr");
  const grades = [];
  for (let i = 3; i < rows.length - 1; i++) {
    const cells = rows[i].querySelectorAll("td");
    if (cells.length < 9) continue;

    const year = cells[0].textContent?.trim();
    const semester = cells[1].textContent?.trim();
    const course_id = cells[2].textContent?.trim();
    const course_name_raw = cells[3].textContent?.trim().split("\n");
    const name_zh_ge = course_name_raw?.[0]?.trim() ?? "";
    const name_en = course_name_raw?.[2]?.trim() ?? "";
    const course_credits = parseSafeInt(cells[4].textContent?.trim());
    const grade_text = cells[5].textContent?.trim();
    const grade = !grade_text?.startsWith("成績未到") ? grade_text : "成績未到";
    const ge_type = cells[6].textContent
      ?.trim()
      .replace("Elective GE course:", "");
    const ranking = cells[7].querySelector("div")?.textContent?.trim();
    const t_scores = cells[8].textContent?.trim();
    const [name_zh, ge_description] = name_zh_ge.split(" -- ");
    grades.push({
      raw_id: `${year}${semester}${course_id}`,
      year,
      semester,
      course_id,
      name_zh,
      name_en,
      credits: course_credits,
      grade,
      ge_type,
      ge_description,
      ranking,
      t_scores,
    });
  }

  const ranking_rows = ranking_table.querySelectorAll("tr");
  const ranking_data = [];
  for (let i = 3; i < ranking_rows.length - 1; i++) {
    const cells = ranking_rows[i].querySelectorAll("td");
    if (cells.length < 16) continue;

    const year = cells[0].textContent?.trim();
    const semester = cells[1].textContent?.trim();
    const gpa = cells[2].textContent?.trim();
    const t_score_avg = cells[3].textContent?.trim();
    const relative_avg = cells[4].textContent?.trim();
    const semester_credits = parseSafeInt(cells[5].textContent?.trim());
    const actual_credits = parseSafeInt(cells[6].textContent?.trim());
    const num_of_courses = parseSafeInt(cells[7].textContent?.trim());
    const summer_credits = parseSafeInt(cells[8].textContent?.trim());
    const transfer_credits = parseSafeInt(cells[9].textContent?.trim());
    const letter_class_rank = cells[10].textContent?.trim();
    const letter_dept_rank = cells[11].textContent?.trim();
    const t_score_class_rank = cells[12].textContent?.trim();
    const t_score_dept_rank = cells[13].textContent?.trim();
    const relative_class_rank = cells[14].textContent?.trim();
    const relative_dept_rank = cells[15].textContent?.trim();
    const comments = cells[16]?.textContent?.trim() ?? "";
    ranking_data.push({
      year,
      semester,
      gpa,
      t_score_avg,
      relative_avg,
      credits: semester_credits,
      actual_credits,
      num_of_courses,
      summer_credits,
      transfer_credits,
      letter_class_rank,
      letter_dept_rank,
      t_score_class_rank,
      t_score_dept_rank,
      relative_class_rank,
      relative_dept_rank,
      comments,
    });
  }

  const ranking_cum_row = ranking_rows[ranking_rows.length - 1];
  const ranking_cum_cells = (ranking_cum_row?.querySelectorAll("td > div") ??
    []) as HTMLDivElement[];
  const class_type = ranking_cum_row?.textContent?.includes("等級制畢業系排名")
    ? "grad"
    : "undergrad";

  const ranking_cum = (() => {
    if (class_type === "grad") {
      const letter_cum = Array.from(ranking_cum_cells[0]?.childNodes ?? [])
        .find((node) => node.textContent?.startsWith("等級制畢業系排名"))
        ?.textContent?.trim();
      const letter_cum_regex =
        /等級制畢業系排名\/總人數、畢業班排名\/總人數、GPA： (?<letter_cum_dept_rank>.+)、(?<letter_cum_class_rank>.+)、(?<gpa>.+)/;
      const letter_cum_match = letter_cum?.match(letter_cum_regex);
      const letter = {
        letter_cum_dept_rank: letter_cum_match?.groups?.letter_cum_dept_rank,
        letter_cum_class_rank: letter_cum_match?.groups?.letter_cum_class_rank,
        gpa: letter_cum_match?.groups?.gpa,
      };
      const relative_cum =
        ranking_cum_cells[1]?.firstChild?.textContent?.trim();
      const relative_cum_regex =
        /修課相對成績畢業系排名\/總人數、修課相對成績學業平均成績：(?<relative_cum_dept_rank>.+)、(?<relative_cum_class_rank>.+)、(?<relative_cum>.+)/;
      const relative_cum_match = relative_cum?.match(relative_cum_regex);
      const relative = {
        relative_cum_dept_rank:
          relative_cum_match?.groups?.relative_cum_dept_rank,
        relative_cum_class_rank:
          relative_cum_match?.groups?.relative_cum_class_rank,
        relative_cum: relative_cum_match?.groups?.relative_cum,
      };
      const t_scores_cum =
        ranking_cum_cells[2]?.firstChild?.textContent?.trim();
      const t_scores_cum_regex =
        /T分數畢業系排名\/總人數、T分數成績學業平均成績：(?<t_scores_cum_dept_rank>.+)、(?<t_scores_cum_class_rank>.+)、(?<t_scores_cum>.+)/;
      const t_scores_cum_match = t_scores_cum?.match(t_scores_cum_regex);
      const t_scores = {
        t_scores_cum_dept_rank:
          t_scores_cum_match?.groups?.t_scores_cum_dept_rank,
        t_scores_cum_class_rank:
          t_scores_cum_match?.groups?.t_scores_cum_class_rank,
        t_scores_cum: t_scores_cum_match?.groups?.t_scores_cum,
      };
      return { letter, relative, t_scores };
    }

    const letter_cum = Array.from(ranking_cum_cells[0]?.childNodes ?? [])
      .find((node) => node.textContent?.startsWith("等級制累計系排名"))
      ?.textContent?.trim();
    const letter_cum_regex =
      /等級制累計系排名\/總人數、累計班排名\/總人數、GPA\(至(?<gpa_cum_year_tw>.+)\)： (?<letter_cum_dept_rank>.+)、(?<letter_cum_class_rank>.+)、(?<gpa>.+)/;
    const letter_cum_match = letter_cum?.match(letter_cum_regex);
    const letter = {
      gpa_cum_year_tw: letter_cum_match?.groups?.gpa_cum_year_tw,
      letter_cum_dept_rank: letter_cum_match?.groups?.letter_cum_dept_rank,
      letter_cum_class_rank: letter_cum_match?.groups?.letter_cum_class_rank,
      gpa: letter_cum_match?.groups?.gpa,
    };
    const relative_cum = ranking_cum_cells[1]?.firstChild?.textContent?.trim();
    const relative_cum_regex =
      /修課相對成績學業累計系排名\/總人數、累計班排名\/總人數、修課相對成績學業平均成績\(至(?<gpa_cum_year_tw>.+)\)： (?<relative_cum_dept_rank>.+)、(?<relative_cum_class_rank>.+)、(?<relative_cum>.+)/;
    const relative_cum_match = relative_cum?.match(relative_cum_regex);
    const relative = {
      gpa_cum_year_tw: relative_cum_match?.groups?.gpa_cum_year_tw,
      relative_cum_dept_rank:
        relative_cum_match?.groups?.relative_cum_dept_rank,
      relative_cum_class_rank:
        relative_cum_match?.groups?.relative_cum_class_rank,
      relative_cum: relative_cum_match?.groups?.relative_cum,
    };
    const t_scores_cum = ranking_cum_cells[2]?.firstChild?.textContent?.trim();
    const t_scores_cum_regex =
      /T分數學業累計系排名\/總人數、T分數成績學業平均成績\(至(?<gpa_cum_year_tw>.+)\)： (?<t_scores_cum_dept_rank>.+)、(?<t_scores_cum_class_rank>.+)、(?<t_scores_cum>.+)/;
    const t_scores_cum_match = t_scores_cum?.match(t_scores_cum_regex);
    const t_scores = {
      gpa_cum_year_tw: t_scores_cum_match?.groups?.gpa_cum_year_tw,
      t_scores_cum_dept_rank:
        t_scores_cum_match?.groups?.t_scores_cum_dept_rank,
      t_scores_cum_class_rank:
        t_scores_cum_match?.groups?.t_scores_cum_class_rank,
      t_scores_cum: t_scores_cum_match?.groups?.t_scores_cum,
    };
    return { letter, relative, t_scores };
  })();

  return {
    student,
    credits,
    grades,
    ranking: {
      data: ranking_data,
      cumulative: ranking_cum,
    },
  };
};

const app = new Hono().post(
  "/",
  zValidator(
    "form",
    z.object({
      ACIXSTORE: acixStoreSchema,
    }),
  ),
  async (c) => {
    const { ACIXSTORE } = c.req.valid("form");
    const baseURL =
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/R/6.3/JH8R63002.php?ACIXSTORE=";
    const res = await fetch(baseURL + ACIXSTORE);
    if (!res.ok) {
      return c.json({ error: "Failed to fetch grades from CCXP" }, 502);
    }

    const arrayBuffer = await res.arrayBuffer();
    const html = new TextDecoder("big5").decode(new Uint8Array(arrayBuffer));
    const parsed = parseGradesHtml(html);
    return parsed ? c.json(parsed) : c.notFound();
  },
);

export default app;
