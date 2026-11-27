import { afterEach, describe, expect, it, mock } from "bun:test";
import gradesRoute, { parseGradesHtml } from "./grades";

const studentInfo =
  "學號 Student Number：111000001　　姓名 Name：王小明　　班級 Department & Class：資工二";
const creditSummary =
  "修習總學分(包含及格,不及格及成績未到) Total credits( including passing, failing, and not submitted grades)：120　已修及格畢業學分 Passing grade：100　成績未到畢業學分 Not submitted grade：20";

const row = (cells: string[]) =>
  `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;

const cumulativeCells = (type: "undergrad" | "grad") => {
  const values =
    type === "grad"
      ? [
          "等級制畢業系排名/總人數、畢業班排名/總人數、GPA： 1/10、1/5、3.92",
          "修課相對成績畢業系排名/總人數、修課相對成績學業平均成績：1/10、1/5、26.67%",
          "T分數畢業系排名/總人數、T分數成績學業平均成績：1/10、1/5、62.5",
        ]
      : [
          "等級制累計系排名/總人數、累計班排名/總人數、GPA(至112學年下學期)： 1/10、1/5、3.38",
          "修課相對成績學業累計系排名/總人數、累計班排名/總人數、修課相對成績學業平均成績(至112學年下學期)： 1/10、1/5、26.67%",
          "T分數學業累計系排名/總人數、T分數成績學業平均成績(至112學年下學期)： 1/10、1/5、62.5",
        ];
  return row(values.map((value) => `<div>${value}</div>`));
};

const gradesTable = (
  gradeRows: string[] = [
    row([
      "112",
      "10",
      "CS1001",
      "計算機概論\n\nIntroduction to Computer Science",
      "3",
      "A",
      "Elective GE course: Core",
      "<div>10/50</div>",
      "90",
    ]),
  ],
) => `<table>
  <tr><td>${studentInfo}</td></tr>
  <tr><td><p>${creditSummary}</p></td></tr>
  <tr><th>year semester course</th></tr>
  ${gradeRows.join("\n")}
  <tr><td>summary footer</td></tr>
</table>`;

const rankingRow = (
  cells: string[] = [
    "112",
    "10",
    "3.8",
    "60",
    "25%",
    "18",
    "18",
    "6",
    "3",
    "0",
    "1/20",
    "2/80",
    "60",
    "61",
    "25%",
    "26%",
    "",
  ],
) => row(cells);

const rankingTable = (
  dataRows: string[] = [rankingRow()],
  cumulativeRow = cumulativeCells("undergrad"),
) => `<table>
  <tr><td>以下各排名僅供參考</td></tr>
  <tr><th>semester statistics</th></tr>
  <tr><th>ranks</th></tr>
  ${dataRows.join("\n")}
  ${cumulativeRow}
</table>`;

const htmlFixture = (options?: {
  gradeRows?: string[];
  rankingRows?: string[];
  cumulativeRow?: string;
  gradeTable?: boolean;
  rankingTable?: boolean;
}) =>
  `${options?.gradeTable === false ? "" : gradesTable(options?.gradeRows)}
   ${options?.rankingTable === false ? "" : rankingTable(options?.rankingRows, options?.cumulativeRow)}`;

const originalFetch = globalThis.fetch;
const validSession = "abcdefghij0123456789";
const postGrades = () =>
  gradesRoute.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ACIXSTORE: validSession }),
  });

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("parseGradesHtml", () => {
  it("parses an undergrad response with the established response shape", () => {
    const parsed = parseGradesHtml(htmlFixture());

    expect(parsed).not.toBeNull();
    expect(parsed?.student).toEqual({
      studentid: "111000001",
      name_zh: "王小明",
      class_name_zh: "資工二",
    });
    expect(parsed?.credits).toEqual({
      total_credits: 120,
      passed_credits: 100,
      pending_credits: 20,
    });
    expect(parsed?.grades[0]).toMatchObject({
      raw_id: "11210CS1001",
      credits: 3,
      name_zh: "計算機概論",
      name_en: "Introduction to Computer Science",
    });
    expect(parsed?.ranking.data[0]?.credits).toBe(18);
    expect(parsed?.ranking.cumulative.letter.gpa).toBe("3.38");
  });

  it("parses the grad cumulative ranking format", () => {
    const parsed = parseGradesHtml(
      htmlFixture({ cumulativeRow: cumulativeCells("grad") }),
    );

    expect(parsed?.ranking.cumulative.letter).toEqual({
      letter_cum_dept_rank: "1/10",
      letter_cum_class_rank: "1/5",
      gpa: "3.92",
    });
    expect(parsed?.ranking.cumulative.relative.relative_cum).toBe("26.67%");
    expect(parsed?.ranking.cumulative.t_scores.t_scores_cum).toBe("62.5");
  });

  it("turns ungraded placeholders into zeroes and accepts a 16-column ranking row", () => {
    const ungradedRankingRow = rankingRow([
      "112",
      "10",
      "**",
      "**",
      "**",
      "**",
      "**",
      "**",
      "**",
      "**",
      "-",
      "-",
      "-",
      "-",
      "-",
      "-",
    ]);
    const placeholderSummary = creditSummary
      .replace("：120", "：**")
      .replace("：100", "：-")
      .replace("：20", "：**");
    const html = htmlFixture({
      gradeRows: [
        row([
          "112",
          "10",
          "CS1001",
          "計算機概論\n\nIntroduction to Computer Science",
          "**",
          "成績未到",
          "",
          "",
          "",
        ]),
      ],
      rankingRows: [ungradedRankingRow],
    }).replace(creditSummary, placeholderSummary);

    const parsed = parseGradesHtml(html);
    const data = parsed?.ranking.data[0];

    expect(parsed?.credits).toEqual({
      total_credits: 0,
      passed_credits: 0,
      pending_credits: 0,
    });
    expect(parsed?.grades[0]?.credits).toBe(0);
    expect(data).toMatchObject({
      credits: 0,
      actual_credits: 0,
      num_of_courses: 0,
      summer_credits: 0,
      transfer_credits: 0,
      comments: "",
    });
    expect(JSON.stringify(parsed)).not.toContain("null");
  });

  it("skips short grade and ranking rows", () => {
    const parsed = parseGradesHtml(
      htmlFixture({
        gradeRows: [row(["notice"]), gradesTableRow()],
        rankingRows: [
          row(Array.from({ length: 15 }, () => "short")),
          rankingRow(),
        ],
      }),
    );

    expect(parsed?.grades).toHaveLength(1);
    expect(parsed?.ranking.data).toHaveLength(1);
  });

  it("handles absent and partial cumulative cells", () => {
    const partial = parseGradesHtml(
      htmlFixture({
        cumulativeRow: row(["<div>partial cumulative data</div>"]),
      }),
    );
    const missing = parseGradesHtml(
      `<table><tr><td>以下各排名僅供參考</td></tr></table>${gradesTable()}`,
    );

    expect(partial?.ranking.cumulative.letter.gpa).toBeUndefined();
    expect(missing?.ranking.cumulative.letter.gpa).toBeUndefined();
  });

  it("returns null when either required table is missing", () => {
    expect(parseGradesHtml(htmlFixture({ gradeTable: false }))).toBeNull();
    expect(parseGradesHtml(htmlFixture({ rankingTable: false }))).toBeNull();
  });
});

describe("grades route", () => {
  it("returns 404 when required grades or ranking tables are missing", async () => {
    globalThis.fetch = mock(
      async () => new Response("<html><table></table></html>"),
    ) as unknown as typeof fetch;

    const response = await postGrades();

    expect(response.status).toBe(404);
  });

  it("returns a safe 502 JSON error for an upstream HTTP failure", async () => {
    globalThis.fetch = mock(
      async () => new Response("private upstream body", { status: 500 }),
    ) as unknown as typeof fetch;

    const response = await postGrades();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Failed to fetch grades from CCXP",
    });
  });
});

const gradesTableRow = () =>
  row([
    "112",
    "10",
    "CS1001",
    "計算機概論\n\nIntroduction to Computer Science",
    "3",
    "A",
    "Core",
    "<div>10/50</div>",
    "90",
  ]);
