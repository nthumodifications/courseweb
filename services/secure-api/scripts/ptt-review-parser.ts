export type ParsedPttPost = {
  courseName: string | null;
  courseCode: string | null;
  instructor: string | null;
  semester: string | null;
  moduleKey: string | null;
  instructors: string[];
  coolness: number | null;
  sweetness: number | null;
  body: string;
  sourceAuthor: string | null;
  sourcePostedAt: Date | null;
};

const normalizePart = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/gu, " ");

export const createModuleKey = (department: string, course: string) => {
  const normalizedDepartment = normalizePart(department);
  const normalizedCourse = normalizePart(course).replace(/\s+/gu, "");
  if (!normalizedDepartment || !normalizedCourse) {
    throw new Error("A module key needs both department and course");
  }
  return `${normalizedDepartment}:${normalizedCourse}`;
};

export const parseCourseCode = (value: string) => {
  const normalized = normalizePart(value);
  const match =
    /^(\d{5})([^\d]+?)(\d{4})(?:\d{2})?$/u.exec(normalized) ??
    /^(?:(\d{5}))?([^\d]+?)(\d{4})(?:\d{2})?$/u.exec(normalized);
  if (!match) return null;

  const [, semester, department, course] = match;
  if (!department || !course) return null;
  return {
    semester,
    department: normalizePart(department),
    course: normalizePart(course).replace(/\s+/gu, ""),
    moduleKey: createModuleKey(department, course),
  };
};

const FIELD_ALIASES = {
  courseName: ["課名", "課程名稱", "課程名"],
  courseCode: ["科號", "課號"],
  instructor: ["老師", "授課教師", "授課老師"],
  coolness: ["涼度", "涼度評價", "清涼度"],
  sweetness: ["甜度", "甜度評價"],
} as const;

type Field = keyof typeof FIELD_ALIASES;
const fieldByLabel = new Map<string, Field>(
  Object.entries(FIELD_ALIASES).flatMap(([field, labels]) =>
    labels.map((label) => [label, field as Field] as const),
  ),
);

const fieldLine = (line: string) => {
  const match = /^\s*([^:：]{1,40})\s*[:：]\s*(.*)$/u.exec(line);
  if (!match) return null;
  return {
    field: fieldByLabel.get(normalizePart(match[1]!)),
    value: match[2]?.trim() ?? "",
  };
};

const parseRating = (value: string) => {
  const filled = (value.match(/★/gu) ?? []).length;
  const empty = (value.match(/☆/gu) ?? []).length;
  const total = filled + empty;
  if (total >= 3)
    return Math.max(1, Math.min(5, Math.round((filled / total) * 5)));
  if (filled > 0 && empty === 0 && filled <= 5) return filled;

  const numeric = /\b([1-5])(?:\s*\/\s*5)?\b/u.exec(value);
  return numeric ? Number(numeric[1]) : null;
};

const splitInstructors = (value: string | null) => [
  ...new Set(
    (value ?? "")
      .split(/(?:、|,|，|\/|／|;|；|\s+and\s+)/iu)
      .map(normalizePart)
      .filter(Boolean),
  ),
];

export type ModuleOfferingTeachers = {
  teacher_zh?: readonly string[] | null;
  teacher_en?: readonly string[] | null;
};

export const hasCjkCharacters = (value: string) => /\p{Script=Han}/u.test(value);

const instructorLookupKeys = (value: string) => {
  const normalized = normalizePart(value).toLocaleLowerCase();
  const compact = normalized.replace(/[\s-]+/gu, "");
  const keys = new Set([compact]);
  const commaParts = normalized.split(",").map((part) => part.trim());
  if (commaParts.length === 2 && commaParts.every(Boolean)) {
    keys.add(commaParts.reverse().join("").replace(/[\s-]+/gu, ""));
  }
  return keys;
};

export const resolveInstructorName = (
  name: string,
  offerings: readonly ModuleOfferingTeachers[],
) => {
  const normalizedName = normalizePart(name);
  if (hasCjkCharacters(normalizedName)) return normalizedName;

  const nameKeys = instructorLookupKeys(normalizedName);
  const matches = new Set<string>();
  for (const offering of offerings) {
    const teacherZh = offering.teacher_zh ?? [];
    const teacherEn = offering.teacher_en ?? [];
    for (let index = 0; index < Math.min(teacherZh.length, teacherEn.length); index += 1) {
      const teacherZhName = normalizePart(teacherZh[index] ?? "");
      if (
        teacherZhName &&
        [...instructorLookupKeys(teacherEn[index] ?? "")].some((key) =>
          nameKeys.has(key),
        )
      ) {
        matches.add(teacherZhName);
      }
    }
  }

  return matches.size === 1 ? [...matches][0]! : normalizedName;
};

const parseHeader = (text: string) => {
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const fields = new Map<Field, string>();
  let started = false;
  let end = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!line.trim()) {
      if (started) {
        end = index + 1;
        break;
      }
      continue;
    }
    const parsed = fieldLine(line);
    if (parsed?.field) {
      started = true;
      fields.set(parsed.field, parsed.value);
      end = index + 1;
    } else if (!started) {
      continue;
    }
  }

  return {
    fields,
    body: lines.slice(end).join("\n").trim(),
  };
};

const parsePostedAt = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value} GMT+0800`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parsePttReviewText = (input: {
  text: string;
  sourceAuthor?: string | null;
  sourcePostedAt?: string | null;
}) => {
  const header = parseHeader(input.text);
  const courseCode = header.fields.get("courseCode") ?? null;
  const parsedCode = courseCode ? parseCourseCode(courseCode) : null;
  const instructor = header.fields.get("instructor") ?? null;
  const instructors = splitInstructors(instructor);

  return {
    courseName: header.fields.get("courseName") ?? null,
    courseCode,
    instructor,
    semester: parsedCode?.semester ?? null,
    moduleKey: parsedCode?.moduleKey ?? null,
    instructors,
    coolness: parseRating(header.fields.get("coolness") ?? ""),
    sweetness: parseRating(header.fields.get("sweetness") ?? ""),
    body: header.body.slice(0, 20_000),
    sourceAuthor: input.sourceAuthor?.trim() || null,
    sourcePostedAt: parsePostedAt(input.sourcePostedAt ?? null),
  } satisfies ParsedPttPost;
};

const decodeHtml = (value: string) =>
  value
    .replace(/<!--(?:.|\n|\r)*?-->/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&#(\d+);/gu, (_, decimal: string) =>
      String.fromCodePoint(Number(decimal)),
    )
    .replace(/&#x([\da-f]+);/giu, (_, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
    );

const htmlToText = (value: string) =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/div\s*>/giu, "\n")
      .replace(/<[^>]+>/gu, ""),
  );

const metaValue = (html: string, index: number) => {
  const values = [
    ...html.matchAll(
      /<span\s+class=["']article-meta-value["'][^>]*>([\s\S]*?)<\/span>/giu,
    ),
  ];
  return values[index]?.[1] ? htmlToText(values[index][1]).trim() : null;
};

export const parsePttPostHtml = (input: {
  html: string;
  sourceUrl: string;
}) => {
  const contentMatch =
    /<div\s+id=["']main-content["'][^>]*>([\s\S]*?)<div\s+id=["']article-polling["']/iu.exec(
      input.html,
    );
  const text = htmlToText(contentMatch?.[1] ?? input.html)
    .replace(/\u00a0/gu, " ")
    .trim();
  const author = metaValue(input.html, 0);
  return parsePttReviewText({
    text,
    sourceAuthor: author?.split(/\s+/u)[0] ?? null,
    sourcePostedAt: metaValue(input.html, 3),
  });
};
