export type PttReviewFields = {
  courseName: string | null;
  instructor: string | null;
  semester: string | null;
  target: string | null;
  courseContent: string | null;
  textbook: string | null;
  teachingMethod: string | null;
  grading: string | null;
  notes: string | null;
  experience: string | null;
  summary: string | null;
  workload: string | null;
  sweetness: string | null;
  coolness: string | null;
};

export type PttReviewBlock =
  | { kind: "text"; text: string }
  | {
      kind: "field";
      field: keyof PttReviewFields;
      text: string;
      value: string;
    };

export type PttReview = PttReviewFields & {
  parsed: boolean;
  body: string;
  content: string;
  date: string | null;
  blocks: PttReviewBlock[];
};

type ReviewFieldKey = keyof PttReviewFields;

const FIELD_ALIASES: ReadonlyArray<readonly [ReviewFieldKey, ...string[]]> = [
  ["courseName", "課名", "課程名稱", "課程名"],
  ["instructor", "老師", "授課教師", "授課老師"],
  ["semester", "哪一學年度修課", "修課學年度", "修課學期", "修課學年"],
  ["target", "開課系所與授課對象", "開課系所", "授課對象", "課別"],
  ["courseContent", "課程大概內容", "課程內容簡介", "課程內容", "課程簡介"],
  ["textbook", "用書", "課本", "教科書"],
  ["teachingMethod", "教學方式", "上課方式"],
  ["grading", "評分方式", "給分", "評分"],
  ["notes", "注意事項", "補充", "備註", "老師的喜好、個性", "老師的喜好個性"],
  ["experience", "心得", "修課心得", "心得感想"],
  ["summary", "總結"],
  ["workload", "工作量", "作業量", "課程負擔", "負擔", "考試作業型態"],
  ["sweetness", "甜度", "甜度評價"],
  ["coolness", "涼度", "涼度評價", "清涼度"],
];

const FIELD_BY_LABEL = new Map<string, ReviewFieldKey>(
  FIELD_ALIASES.flatMap(([key, ...labels]) =>
    labels.map((label) => [normalizeLabel(label), key] as const),
  ),
);

function normalizeLabel(label: string) {
  return label.replace(/[\\\s]/g, "").replace(/[：:]+$/, "");
}

function cleanValue(lines: string[]) {
  return lines
    .join("\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function emptyFields(): PttReviewFields {
  return {
    courseName: null,
    instructor: null,
    semester: null,
    target: null,
    courseContent: null,
    textbook: null,
    teachingMethod: null,
    grading: null,
    notes: null,
    experience: null,
    summary: null,
    workload: null,
    sweetness: null,
    coolness: null,
  };
}

function fieldForLine(line: string) {
  const header = line.match(/^\s*([^:：]{1,40})\s*[:：]\s*(.*)$/);
  const summary = line.match(/^\s*總結(?:來說)?[：:,，]\s*(.*)$/);
  const exactLabel = normalizeLabel(line.trim());
  const field = header
    ? FIELD_BY_LABEL.get(normalizeLabel(header[1]))
    : summary
      ? "summary"
      : FIELD_BY_LABEL.get(exactLabel);

  return { field, value: summary?.[1]?.trim() ?? header?.[2]?.trim() ?? "" };
}

function isUnknownHeader(line: string) {
  return /^\s*[^:：]{1,40}\s*[:：]/.test(line);
}

function parseBlocks(body: string) {
  const blocks: PttReviewBlock[] = [];
  const fields = new Map<ReviewFieldKey, string>();
  let plainLines: string[] = [];
  let field: {
    key: ReviewFieldKey;
    sourceLines: string[];
    valueLines: string[];
  } | null = null;

  const flushPlain = () => {
    if (plainLines.length > 0) {
      blocks.push({ kind: "text", text: plainLines.join("\n") });
      plainLines = [];
    }
  };
  const flushField = () => {
    if (!field) return;
    const value = cleanValue(field.valueLines);
    blocks.push({
      kind: "field",
      field: field.key,
      text: field.sourceLines.join("\n"),
      value,
    });
    if (value) fields.set(field.key, value);
    field = null;
  };

  for (const line of body.split("\n")) {
    const parsedLine = fieldForLine(line);
    if (parsedLine.field) {
      flushField();
      flushPlain();
      field = {
        key: parsedLine.field,
        sourceLines: [line],
        valueLines: parsedLine.value ? [parsedLine.value] : [],
      };
    } else if (field && (!isUnknownHeader(line) || !line.trim())) {
      field.sourceLines.push(line);
      field.valueLines.push(line);
    } else {
      flushField();
      plainLines.push(line);
    }
  }

  flushField();
  flushPlain();
  return { blocks, fields };
}

const bodyFrom = (input: unknown) => {
  if (!input || typeof input !== "object") return "";
  const record = input as Record<string, unknown>;
  return typeof record.body === "string"
    ? record.body
    : typeof record.content === "string"
      ? record.content
      : "";
};

const dateFrom = (input: unknown) => {
  if (!input || typeof input !== "object") return null;
  const date = (input as Record<string, unknown>).date;
  return typeof date === "string" && date.trim() ? date.trim() : null;
};

function plainReview(body: string, date: string | null): PttReview {
  return {
    ...emptyFields(),
    parsed: false,
    body,
    content: body,
    date,
    blocks: [{ kind: "text", text: body }],
  };
}

export function parsePttReview(input: {
  text: string;
  date?: string | null;
}): PttReview {
  const body = input.text.replace(/\r\n?/g, "\n").trim();
  const { blocks, fields } = parseBlocks(body);
  const parsed = fields.size >= 2;
  const values = emptyFields();

  if (parsed) {
    for (const [key, value] of fields) values[key] = value;
  }

  return {
    ...values,
    parsed,
    body,
    content: body,
    date: input.date?.trim() || null,
    blocks,
  };
}

/** Convert the API's current { content, date } response into the web view model. */
export function parsePttResponse(input: unknown): PttReview {
  return parsePttReview({ text: bodyFrom(input), date: dateFrom(input) });
}

/** Keep an old persisted response visible as the plain text shown by the main branch. */
export function normalizePttReview(input: unknown): PttReview {
  if (
    input &&
    typeof input === "object" &&
    (input as Record<string, unknown>).parsed === true &&
    Array.isArray((input as Record<string, unknown>).blocks)
  ) {
    return input as PttReview;
  }
  const body = bodyFrom(input).replace(/\r\n?/g, "\n").trim();
  return plainReview(body, dateFrom(input));
}

export function getPttRenderedTextFragments(review: PttReview) {
  return review.blocks.map((block) => block.text);
}

export function getPttToggleLabel(
  open: boolean,
  labels: { expand: string; collapse: string },
) {
  return open ? labels.collapse : labels.expand;
}
