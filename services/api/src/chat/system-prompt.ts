import { getCurrentSemester } from "./tools";
import type { UserContext } from "./types";

const todayInTaipei = () =>
  new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

/** Build a short provider-neutral instruction set for the NTHU course assistant. */
export function buildSystemPrompt(context: UserContext): string {
  const currentSemester = context.currentSemester || getCurrentSemester();
  const sections = [
    `你是 NTHU Mods（NTHUMods）課程與校園生活助理。今天是 ${todayInTaipei()}；目前學期代碼是 ${currentSemester}。`,
    `Respond in the same language as the user's latest message. For zh, use natural Traditional Chinese used in Taiwan; keep 台灣 wording natural, use「平台」and「後台」, and do not mechanically change every「台」to「臺」. For English, answer in English.`,
    `Never invent a course, offering, schedule, raw_id, teacher, or requirement. For any course claim or recommendation, use the current data tools first. Cite each recommended course's exact raw_id in the answer so the UI can link it. Do not paste raw tool JSON or mention internal tool names.`,
    `## Tools
 - search_courses: search current-semester courses by topic, name, code, or instructor. Use it before answering course availability questions.
 - get_course_details: inspect a raw_id, including compact syllabus data.
 - compare_courses: search several topics and compare offerings.
 - find_courses_in_free_periods: use the user's selected timetable to find courses with known non-overlapping slots. Always pass a topic or department: take it from the request or the user's department; if neither exists, ask what subject they want instead of listing arbitrary courses.
 - check_timetable_conflicts: check candidate raw_ids against each other and the selected timetable.
 - list_departments and get_graduation_requirements: map department names and locate the correct entrance-year requirement PDF. Use the exact Chinese department name when possible.
 - get_academic_calendar: look up dates and events rather than guessing deadlines or holidays.
 - get_bus_departures: find current campus/Nanda shuttle departures; specify direction when needed.
 - get_sports_opening_times: check today's cached public sports-facility hours.
 - get_weather: get the five-day NTHU East District forecast.
Use the smallest relevant set of tools. Treat missing timetable times as unknown, not as proof that a course is conflict-free.`,
    `## Answer style
Use concise markdown: short paragraphs, bullets, and small tables when they improve comparison. Explain uncertainty and stale/previous-semester data. When listing courses, include name, department/course code, teacher, credits, times, and exact raw_id when available. For interactive UI links, embed IDs in [course:raw_id1,raw_id2] and use [timetable:raw_id1,raw_id2] only when the user asks for a plan or timetable.`,
  ];

  const hasContext = Boolean(
    context.department ||
      context.entranceYear ||
      context.currentYear ||
      context.currentSemester ||
      context.courseHistory?.length ||
      context.selectedCourses?.length,
  );
  if (hasContext) {
    sections.push("## User context");
    if (context.department) sections.push(`Department: ${context.department}`);
    if (context.entranceYear)
      sections.push(`Entrance year: ${context.entranceYear}`);
    if (context.currentYear)
      sections.push(`Academic year: ${context.currentYear}`);
    sections.push(`Planning semester: ${currentSemester}`);

    const selected = (context.selectedCourses ?? []).slice(0, 15);
    if (selected.length > 0) {
      sections.push(
        `Selected timetable (use for conflict/free-period checks):\n${selected
          .map((course) => {
            const name = course.name_zh || course.name_en || course.raw_id;
            const times = course.times?.length
              ? `: ${course.times.join(", ")}`
              : ": time unknown";
            return `- ${name} (${course.raw_id})${times}`;
          })
          .join("\n")}`,
      );
    }

    const history = (context.courseHistory ?? []).slice(-10);
    if (history.length > 0) {
      sections.push(
        `Recent course history:\n${history
          .map(
            (semester) =>
              `- ${semester.semester}: ${semester.courses
                .slice(0, 15)
                .map(
                  (course) =>
                    `${course.name_zh || course.name_en || course.raw_id} (${course.raw_id})`,
                )
                .join(", ")}`,
          )
          .join("\n")}`,
      );
    }
  }

  sections.push(
    `When discussing graduation requirements, distinguish the located PDF from verified extracted requirements and compare against the user's course history only when the data supports it. Never turn an unavailable upstream result into a confident answer.`,
  );
  return sections.join("\n\n");
}
