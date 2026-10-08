export interface PrerequisiteCourseCandidate {
  raw_id: string;
  department: string;
  course: string;
  name_zh: string;
  name_en?: string | null;
}

export type PrerequisiteNode =
  | {
      type: "allOf";
      children: PrerequisiteNode[];
    }
  | {
      type: "anyOf";
      children: PrerequisiteNode[];
    }
  | {
      type: "course";
      name: string;
      rawText: string;
      resolvedCourseKeys: string[];
      preferredCourseKey?: string;
      ambiguous: boolean;
      minimumGrade?: string;
      mustNotHaveTaken?: boolean;
    }
  | {
      type: "unparsed";
      rawText: string;
    };

export type PrerequisiteCoverage = "full" | "partial" | "untouched";

export interface ParsedPrerequisites {
  rawText: string;
  normalizedText: string;
  audience?: string;
  nodes: PrerequisiteNode[];
  unparsedRemainder: string;
  coverage: PrerequisiteCoverage;
}

interface CourseCatalogIndex {
  byName: Map<string, PrerequisiteCourseCandidate[]>;
}

interface CompactText {
  value: string;
  sourcePositions: number[];
}

interface ParsedItem {
  name: string;
  rawText: string;
  minimumGrade?: string;
  mustNotHaveTaken?: boolean;
}

const GRADE_VALUE = "(?:[A-F](?:[+-])?|\\d+(?:\\.\\d+)?(?:分|%)?)";
const GRADE_SUFFIX = new RegExp(`[-‐‑‒–—]成績[需須](${GRADE_VALUE})以上`, "gi");
const ITEM_MARKER = /曾修|未修過/g;
const GROUP_MARKER = /上述條件\s*(任選一科|任一科|一定要有|皆須|均須)/g;
const GROUP_CONNECTOR = /^[，,]\s*(?:而且|並且|以及|且)\s*/;
const FINAL_TERMINATOR = /[，,]\s*則不擋修\s*[。.．]?\s*$/i;
const FULL_WIDTH_OFFSET = 0xfee0;

const normalizeText = (value: string) =>
  value
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[！-～]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - FULL_WIDTH_OFFSET),
    )
    .replace(/\u3000/g, " ")
    .normalize("NFKC");

const comparable = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .toLocaleLowerCase();

export const normalizePrerequisiteName = comparable;

const compactText = (value: string): CompactText => {
  const sourcePositions: number[] = [];
  let compact = "";
  for (let index = 0; index < value.length; index += 1) {
    if (/\s/.test(value[index])) continue;
    compact += value[index];
    sourcePositions.push(index);
  }
  return { value: compact, sourcePositions };
};

const sliceCompact = (
  source: string,
  compact: CompactText,
  start: number,
  end: number,
) => {
  if (end <= start) return "";
  const sourceStart = compact.sourcePositions[start];
  const sourceEnd = compact.sourcePositions[end - 1];
  if (sourceStart === undefined || sourceEnd === undefined) return "";
  return source.slice(sourceStart, sourceEnd + 1).trim();
};

const catalogIndexCache = new WeakMap<object, CourseCatalogIndex>();

const getCourseCatalogIndex = (
  courses: readonly PrerequisiteCourseCandidate[],
): CourseCatalogIndex => {
  const cached = catalogIndexCache.get(courses);
  if (cached) return cached;

  const index: CourseCatalogIndex = { byName: new Map() };
  for (const course of courses) {
    const name = comparable(course.name_zh);
    index.byName.set(name, [...(index.byName.get(name) ?? []), course]);
  }
  catalogIndexCache.set(courses, index);
  return index;
};

const uniqueCourses = (courses: readonly PrerequisiteCourseCandidate[]) => {
  const seen = new Set<string>();
  return courses.filter((course) => {
    if (seen.has(course.raw_id)) return false;
    seen.add(course.raw_id);
    return true;
  });
};

const resolveCourseName = (
  name: string,
  courses: readonly PrerequisiteCourseCandidate[],
  currentDepartment?: string,
) => {
  const matches = uniqueCourses(
    getCourseCatalogIndex(courses).byName.get(comparable(name)) ?? [],
  );
  const departmentMatches = currentDepartment
    ? matches.filter((course) => course.department === currentDepartment)
    : [];
  const preferredMatches =
    departmentMatches.length === 1
      ? departmentMatches
      : matches.length === 1
        ? matches
        : [];

  return {
    resolvedCourseKeys: matches.map((course) => course.raw_id),
    ...(preferredMatches[0]
      ? { preferredCourseKey: preferredMatches[0].raw_id }
      : {}),
    ambiguous: matches.length > 1,
  };
};

const findExactCatalogNameEndingAt = (
  compact: string,
  start: number,
  end: number,
  catalog: CourseCatalogIndex | undefined,
) => {
  if (!catalog) return undefined;
  const tail = comparable(compact.slice(start, end));
  const candidates = [...catalog.byName.keys()]
    .filter((name) => tail.endsWith(name))
    .sort((left, right) => right.length - left.length);
  const name = candidates[0];
  return name ? { name, start: end - name.length } : undefined;
};

const findExactCatalogBoundary = (
  compact: string,
  start: number,
  end: number,
  catalog: CourseCatalogIndex | undefined,
) => {
  if (!catalog) return undefined;
  const boundaries = [end];
  ITEM_MARKER.lastIndex = start;
  let marker: RegExpExecArray | null;
  while ((marker = ITEM_MARKER.exec(compact)) !== null) {
    if (marker.index >= end) break;
    boundaries.push(marker.index);
  }

  return boundaries
    .filter(
      (boundary) =>
        boundary > start &&
        catalog.byName.has(comparable(compact.slice(start, boundary))),
    )
    .sort((left, right) => right - left)[0];
};

const findNextMarker = (value: string, start: number) => {
  ITEM_MARKER.lastIndex = start;
  return ITEM_MARKER.exec(value);
};

const findNextGrade = (value: string, start: number) => {
  GRADE_SUFFIX.lastIndex = start;
  return GRADE_SUFFIX.exec(value);
};

const parseGroupItems = (
  rawGroup: string,
  catalog: CourseCatalogIndex | undefined,
): ParsedItem[] | undefined => {
  const compact = compactText(rawGroup);
  const items: ParsedItem[] = [];
  let cursor = 0;

  while (cursor < compact.value.length) {
    const marker = compact.value.slice(cursor).match(/^(曾修|未修過)/);
    if (marker) {
      const nameStart = cursor + marker[0].length;
      let itemEnd = compact.value.length;
      const nextMarker = findNextMarker(compact.value, nameStart);

      const nextGrade = findNextGrade(compact.value, nameStart);
      const gradeName = nextGrade
        ? findExactCatalogNameEndingAt(
            compact.value,
            nameStart,
            nextGrade.index,
            catalog,
          )
        : undefined;
      const catalogBoundary = findExactCatalogBoundary(
        compact.value,
        nameStart,
        gradeName?.start ?? nextGrade?.index ?? compact.value.length,
        catalog,
      );
      if (catalogBoundary) itemEnd = catalogBoundary;
      else if (nextMarker) itemEnd = Math.min(itemEnd, nextMarker.index);

      if (nextGrade) {
        if (gradeName && gradeName.start > nameStart) {
          itemEnd = Math.min(itemEnd, gradeName.start);
        } else {
          // Parenthesized generated names provide a grammar boundary even
          // when the following grade item is not in the lookup catalog.
          const closingParenthesis = compact.value.lastIndexOf(
            ")",
            nextGrade.index,
          );
          if (closingParenthesis >= nameStart) {
            itemEnd = Math.min(itemEnd, closingParenthesis + 1);
          }
        }
      }

      const name = sliceCompact(rawGroup, compact, nameStart, itemEnd);
      if (!name) return undefined;
      items.push({
        name,
        rawText: `${marker[0]}${name}`,
        ...(marker[0] === "未修過" ? { mustNotHaveTaken: true } : {}),
      });
      cursor = itemEnd;
      continue;
    }

    const grade = findNextGrade(compact.value, cursor);
    if (!grade || grade.index <= cursor) return undefined;
    const name = sliceCompact(rawGroup, compact, cursor, grade.index);
    if (!name) return undefined;
    items.push({
      name,
      rawText: `${name}-${grade[0].slice(1)}`,
      minimumGrade: grade[1],
    });
    cursor = grade.index + grade[0].length;
  }

  return items.length > 0 ? items : undefined;
};

const makeCourseNode = (
  item: ParsedItem,
  courses: readonly PrerequisiteCourseCandidate[],
  currentDepartment?: string,
): PrerequisiteNode => {
  const resolution = resolveCourseName(item.name, courses, currentDepartment);
  return {
    type: "course",
    name: item.name,
    rawText: item.rawText,
    ...resolution,
    ...(item.minimumGrade ? { minimumGrade: item.minimumGrade } : {}),
    ...(item.mustNotHaveTaken ? { mustNotHaveTaken: true } : {}),
  };
};

const parseOfficialText = (
  text: string,
  courses: readonly PrerequisiteCourseCandidate[],
  currentDepartment?: string,
) => {
  const prerequisiteLabel = /先修(?:科目|課程)\s*[:：]?\s*/i.exec(text);
  if (!prerequisiteLabel) return undefined;

  const finalTerminator = FINAL_TERMINATOR.exec(text);
  if (!finalTerminator || finalTerminator.index < prerequisiteLabel.index) {
    return undefined;
  }

  const audienceText = text.slice(0, prerequisiteLabel.index);
  const audienceMatch = /擋修對象\s*[:：]?\s*([\s\S]*?)\s*$/i.exec(
    audienceText,
  );
  const audience = audienceMatch?.[1].trim();
  const bodyStart = prerequisiteLabel.index + prerequisiteLabel[0].length;
  const body = text.slice(bodyStart, finalTerminator.index);
  const catalog = getCourseCatalogIndex(courses);
  const markers = [...body.matchAll(GROUP_MARKER)];
  if (markers.length === 0) return undefined;

  const groups: PrerequisiteNode[] = [];
  let cursor = 0;
  for (const marker of markers) {
    const rawGroup = body.slice(cursor, marker.index);
    const items = parseGroupItems(rawGroup, catalog);
    if (!items) return undefined;
    const children = items.map((item) =>
      makeCourseNode(item, courses, currentDepartment),
    );
    groups.push({
      type: /任選|任一/.test(marker[1]) ? "anyOf" : "allOf",
      children,
    });

    cursor = marker.index + marker[0].length;
    if (cursor < body.length) {
      const connector = GROUP_CONNECTOR.exec(body.slice(cursor));
      if (!connector) return undefined;
      cursor += connector[0].length;
    }
  }

  if (body.slice(cursor).replace(/\s/g, "")) return undefined;

  return {
    ...(audience ? { audience } : {}),
    nodes:
      groups.length === 1
        ? groups
        : [{ type: "allOf" as const, children: groups }],
  };
};

export const countPrerequisiteItemMarkers = (rawText: string) => {
  const text = normalizeText(rawText);
  const explicitItems = [...text.matchAll(/曾修|未修過/g)].length;
  const gradeItems = [
    ...text.matchAll(new RegExp(`[-‐‑‒–—]成績[需須]${GRADE_VALUE}以上`, "gi")),
  ].length;
  return explicitItems + gradeItems;
};

export const getPrerequisiteItemNames = (
  parsed: ParsedPrerequisites | null | undefined,
) => {
  if (!parsed) return [];
  const names: string[] = [];
  const visit = (nodes: readonly PrerequisiteNode[]) => {
    for (const node of nodes) {
      if (node.type === "course") names.push(node.name);
      else if ("children" in node) visit(node.children);
    }
  };
  visit(parsed.nodes);
  return [...new Set(names)];
};

export const parsePrerequisites = (
  rawText: string,
  courses: readonly PrerequisiteCourseCandidate[] = [],
  options: { currentDepartment?: string } = {},
): ParsedPrerequisites => {
  const normalizedText = normalizeText(rawText);
  if (normalizedText.trim().length === 0) {
    return {
      rawText,
      normalizedText,
      nodes: [],
      unparsedRemainder: "",
      coverage: "untouched",
    };
  }

  const official = parseOfficialText(
    normalizedText,
    courses,
    options.currentDepartment,
  );
  if (!official) {
    return {
      rawText,
      normalizedText,
      nodes: [{ type: "unparsed", rawText }],
      unparsedRemainder: rawText,
      coverage: "untouched",
    };
  }

  return {
    rawText,
    normalizedText,
    ...official,
    unparsedRemainder: "",
    coverage: "full",
  };
};
