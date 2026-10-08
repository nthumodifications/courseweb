export type SyllabusSectionKey =
  | "description"
  | "textbooks"
  | "references"
  | "method"
  | "schedule"
  | "evaluation"
  | "links"
  | "ai"
  | "other";

export type SyllabusSection = {
  key: SyllabusSectionKey;
  title: string;
  body: string;
};

export type CleanSyllabusContent = {
  text: string | null;
  sections: SyllabusSection[];
};

const ENTITY_NAMES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const SECTION_SEPARATOR = /[:：]/u;

const decodeEntitiesOnce = (value: string) =>
  value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal) {
        const codePoint = Number(decimal);
        return Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      if (hexadecimal) {
        const codePoint = Number.parseInt(hexadecimal, 16);
        return Number.isInteger(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return ENTITY_NAMES[name.toLowerCase()] ?? entity;
    },
  );

/** Decode the entities emitted by the registrar, including double-encoded ones. */
const decodeEntities = (value: string) => {
  let decoded = value;
  for (let pass = 0; pass < 3; pass++) {
    const next = decodeEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
};

const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, "\n");

const stripControls = (value: string, keepTabs = false) =>
  value.replace(CONTROL_CHARACTERS, "").replace(keepTabs ? /$^/g : /\t/g, " ");

const isWhitespace = (character: string | undefined) =>
  character !== undefined && character.trim() === "";

const skipWhitespace = (value: string, start: number) => {
  let cursor = start;
  while (cursor < value.length && isWhitespace(value[cursor])) cursor++;
  return cursor;
};

const trimTrailingWhitespace = (value: string) =>
  value
    .split("\n")
    .map((line) => {
      let end = line.length;
      while (end > 0 && isWhitespace(line[end - 1])) end--;
      return line.slice(0, end);
    })
    .join("\n");

const prepareText = (value: string, keepTabs = false, trimTrailing = true) => {
  const prepared = stripControls(
    decodeEntities(normalizeLineEndings(value)),
    keepTabs,
  );
  return trimTrailing ? trimTrailingWhitespace(prepared) : prepared;
};

const displayWidth = (value: string) => {
  let width = 0;
  for (const character of value) {
    width +=
      /\p{Script=Han}/u.test(character) ||
      /[\u1100-\u115f\u2329\u232a\u2e80-\u303e\u3040-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufeff]/u.test(
        character,
      )
        ? 2
        : 1;
  }
  return width;
};

const isCjk = (character: string | undefined) =>
  character !== undefined && /\p{Script=Han}/u.test(character);

const isLatinWordCharacter = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9]/u.test(character);

const isSentencePunctuation = (value: string) =>
  /[。．.!?！？:：;；]$/u.test(value.trimEnd());

const SPACED_LIST_MARKER =
  /^\s*(?:\d+[.)]|[（(]\s*\d+\s*[）)]|[一二三四五六七八九十]+、|[●•*-])(?:\s|$)/u;
// Teachers often type the marker straight against the text (`2.病假須證明`,
// `第五週：…`, `Ch 5 Alkenes`), so these need no space after them. `3.5` is a
// number and `M.D. Deal` is a name, hence the lookaheads.
const TIGHT_LIST_MARKER =
  /^\s*(?:\d{1,2}[.．、)）](?![\d.])|[（(]\s*[\d一二三四五六七八九十A-Za-z]{1,3}\s*[）)]|[一二三四五六七八九十]+[、.．]|[A-Z][.、)](?=\p{Script=Han})|第\s*[\d一二三四五六七八九十]+\s*(?:[週周章講]|單元)|(?:week|chapter|ch|unit|lecture|lesson|part)\.?\s*\d|[①-⑳■◆★※◎○▲△□◇])/iu;

const isListMarker = (line: string) =>
  SPACED_LIST_MARKER.test(line) || TIGHT_LIST_MARKER.test(line);

const HEADING_NUMERALS = "一二三四五六七八九十";

const isHeadingNumeral = (character: string | undefined) =>
  character !== undefined && HEADING_NUMERALS.includes(character);

const isAsciiDigit = (character: string | undefined) =>
  character !== undefined && character >= "0" && character <= "9";

const isAsciiUppercase = (character: string | undefined) =>
  character !== undefined && character >= "A" && character <= "H";

const consumeChineseNumeralMarker = (value: string, start: number) => {
  let cursor = start;
  while (isHeadingNumeral(value[cursor])) cursor++;
  return cursor > start && value[cursor] === "、" ? cursor + 1 : undefined;
};

const consumeParenthesizedNumeralMarker = (value: string, start: number) => {
  if (value[start] !== "(" && value[start] !== "（") return undefined;
  let cursor = skipWhitespace(value, start + 1);
  const numeralStart = cursor;
  while (isHeadingNumeral(value[cursor])) cursor++;
  if (cursor === numeralStart) return undefined;
  cursor = skipWhitespace(value, cursor);
  if (value[cursor] !== ")" && value[cursor] !== "）") return undefined;
  return cursor + 1;
};

const consumeHeadingMarker = (
  value: string,
  start: number,
  includeParenthesized = true,
) => {
  const chineseNumeralEnd = consumeChineseNumeralMarker(value, start);
  if (chineseNumeralEnd !== undefined) return chineseNumeralEnd;

  if (includeParenthesized) {
    const parenthesizedNumeralEnd = consumeParenthesizedNumeralMarker(
      value,
      start,
    );
    if (parenthesizedNumeralEnd !== undefined) return parenthesizedNumeralEnd;
  }

  let cursor = start;
  while (isAsciiDigit(value[cursor])) cursor++;
  if (cursor > start && (value[cursor] === "." || value[cursor] === ")")) {
    return cursor + 1;
  }

  if (value[start] === "●" || value[start] === "•") return start + 1;
  if (
    isAsciiUppercase(value[start]) &&
    (value[start + 1] === "." || value[start + 1] === ")")
  ) {
    return start + 2;
  }
  return undefined;
};

const removeHeadingMarker = (line: string, includeParenthesized = true) => {
  const trimmed = line.trim();
  let markerStart = 0;
  if (trimmed[markerStart] === "#") {
    markerStart = skipWhitespace(trimmed, markerStart + 1);
  }
  const markerEnd = consumeHeadingMarker(
    trimmed,
    markerStart,
    includeParenthesized,
  );
  if (markerEnd === undefined) return { text: trimmed, markerLength: 0 };
  const textStart = skipWhitespace(trimmed, markerEnd);
  return { text: trimmed.slice(textStart), markerLength: textStart };
};

const KNOWN_HEADING_PREFIXES = [
  "課程簡介",
  "課程說明",
  "課程簡述",
  "課程大綱",
  "課程概述",
  "本課程之教學目標",
  "指定用書",
  "參考書籍",
  "教學方式",
  "教學進度",
  "成績考核",
  "可連結之網頁",
  "課程相關網站",
  "生成ai",
  "生成 ai",
  "生成式ai",
  "生成式 ai",
  "ai使用",
  "ai 使用",
  "course description",
  "textbook",
  "text book",
  "text books",
  "reference",
  "references",
  "teaching method",
  "teaching methods",
  "course schedule",
  "syllabus",
  "evaluation",
  "course-related website",
  "course related website",
  "ai usage",
  "ai use",
  "ai guideline",
  "ai policy",
];

const normalizeHeadingText = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/gu, " ");

const isKnownHeading = (line: string) => {
  const { text } = removeHeadingMarker(line);
  const normalized = normalizeHeadingText(text);
  return KNOWN_HEADING_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const startsNewBlock = (line: string) =>
  line.trim() === "" || isListMarker(line) || isKnownHeading(line.trim());

const hasNonWhitespaceTextAfter = (value: string, separator: number) => {
  const suffix = value.slice(separator + 1).trim();
  if (!suffix) return false;
  for (const character of suffix) {
    if (isWhitespace(character)) return false;
  }
  return true;
};

const hasInlineHeadingBody = (line: string) => {
  const trimmed = line.trim();
  for (let index = 0; index < trimmed.length; index++) {
    if (
      (trimmed[index] === ":" || trimmed[index] === "：") &&
      hasNonWhitespaceTextAfter(trimmed, index)
    ) {
      return true;
    }
  }
  return false;
};

const isStandaloneHeading = (line: string) => {
  const trimmed = line.trim();
  if (["基本素養", "核心能力", "備註"].includes(trimmed)) return true;
  return isKnownHeading(trimmed) && !hasInlineHeadingBody(trimmed);
};

const isLowercaseAscii = (character: string | undefined) =>
  character !== undefined && character >= "a" && character <= "z";

const startsWithLowercaseAscii = (value: string) => isLowercaseAscii(value[0]);

const isLowercaseHyphenatedWord = (value: string) =>
  value.endsWith("-") &&
  isLowercaseAscii(value.at(-2)) &&
  isLowercaseAscii(value.at(-3));

const canJoinWrappedLines = (left: string, right: string) => {
  const leftTrimmed = left.trimEnd();
  const rightTrimmed = right.trimStart();
  if (!leftTrimmed || !rightTrimmed) return false;
  if (startsNewBlock(rightTrimmed) || isSentencePunctuation(leftTrimmed)) {
    return false;
  }

  const leftCharacter = [...leftTrimmed].at(-1);
  const rightCharacter = [...rightTrimmed][0];
  return (
    (isLowercaseHyphenatedWord(leftTrimmed) &&
      startsWithLowercaseAscii(rightTrimmed)) ||
    (isCjk(leftCharacter) && isCjk(rightCharacter)) ||
    (isLatinWordCharacter(leftCharacter) &&
      isLatinWordCharacter(rightCharacter)) ||
    (/[，,]$/u.test(leftTrimmed) && isLatinWordCharacter(rightCharacter)) ||
    (isLatinWordCharacter(leftCharacter) && isCjk(rightCharacter)) ||
    (isCjk(leftCharacter) && isLatinWordCharacter(rightCharacter))
  );
};

const joinWrappedLines = (left: string, right: string) => {
  const leftTrimmed = left.trimEnd();
  const rightTrimmed = right.trimStart();
  if (!leftTrimmed || !rightTrimmed) return `${leftTrimmed}${rightTrimmed}`;

  if (
    isLowercaseHyphenatedWord(leftTrimmed) &&
    startsWithLowercaseAscii(rightTrimmed)
  ) {
    return `${leftTrimmed}${rightTrimmed}`;
  }

  const leftCharacter = [...leftTrimmed].at(-1);
  const rightCharacter = [...rightTrimmed][0];
  if (isCjk(leftCharacter) && isCjk(rightCharacter)) {
    return `${leftTrimmed}${rightTrimmed}`;
  }
  if (
    isLatinWordCharacter(leftCharacter) &&
    isLatinWordCharacter(rightCharacter)
  ) {
    return `${leftTrimmed} ${rightTrimmed}`;
  }
  if (/，$/u.test(leftTrimmed) && isLatinWordCharacter(rightCharacter)) {
    return `${leftTrimmed}${rightTrimmed}`;
  }
  if (isLatinWordCharacter(rightCharacter) && /[.,;:!?)]$/u.test(leftTrimmed)) {
    return `${leftTrimmed} ${rightTrimmed}`;
  }
  return `${leftTrimmed}${rightTrimmed}`;
};

// The registrar wraps at a fixed column somewhere below this width; anything
// wider is already a joined paragraph, never a wrapped line.
const MAXIMUM_WRAP_WIDTH = 132;
const FULL_RATIO = 0.7;
// A source wrapped twice at slightly different widths leaves a few
// characters on a line of their own between two full lines.
const TAIL_RATIO = 0.3;

// Wrap width is measured in rendered pixels at the source, so mixed CJK and
// Latin lines of one paragraph differ a lot in column count.
const fullLineThreshold = (maximumWidth: number) =>
  Math.max(24, Math.round(maximumWidth * FULL_RATIO));

/**
 * Join registrar hard-wraps. A line continues into the next one only when it
 * is "full" (close to the text's own wrap width); short lines are structure
 * (headings, list items, paragraph ends) and always keep their break.
 */
const unwrapHardWrappedText = (value: string) => {
  const lines = value.split("\n");
  const wrapCandidates = lines
    .map(displayWidth)
    .filter((width) => width > 0 && width <= MAXIMUM_WRAP_WIDTH);
  if (wrapCandidates.length < 2) return value;
  const maximumWidth = Math.max(...wrapCandidates);
  if (maximumWidth < 24) return value;
  const lineThreshold = fullLineThreshold(maximumWidth);
  const tailLimit = Math.round(maximumWidth * TAIL_RATIO);
  const isFull = (line: string) => {
    const width = displayWidth(line);
    return width >= lineThreshold && width <= MAXIMUM_WRAP_WIDTH;
  };

  const unwrapped: string[] = [];
  let index = 0;
  while (index < lines.length) {
    let joined = lines[index];
    let segment = lines[index];
    let afterFullLine = false;
    let cursor = index;
    while (
      segment.trim() !== "" &&
      !isStandaloneHeading(segment) &&
      (isFull(segment) || (afterFullLine && displayWidth(segment) <= tailLimit))
    ) {
      afterFullLine = isFull(segment);
      let nextIndex = cursor + 1;
      while (nextIndex < lines.length && lines[nextIndex].trim() === "") {
        nextIndex++;
      }
      if (
        nextIndex >= lines.length ||
        !canJoinWrappedLines(joined, lines[nextIndex])
      ) {
        break;
      }
      segment = lines[nextIndex];
      joined = joinWrappedLines(joined, segment);
      cursor = nextIndex;
    }
    unwrapped.push(joined);
    index = cursor + 1;
  }
  return unwrapped.join("\n");
};

const collapseExcessiveBreaks = (value: string) =>
  value.replace(/\n{3,}/g, "\n\n");

const hasWrappedLineAcrossGap = (
  lines: string[],
  index: number,
  next: number,
  lineThreshold: number,
) =>
  next - index > 1 &&
  displayWidth(lines[index]) >= lineThreshold &&
  canJoinWrappedLines(lines[index], lines[next]);

const looksDoubleSpaced = (value: string) => {
  const lines = value.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length < 3) return false;
  const maximumWidth = Math.max(...nonEmptyLines.map(displayWidth));
  const lineThreshold = fullLineThreshold(maximumWidth);
  let gaps = 0;
  let doubledGaps = 0;
  let hasWrappedDoubleGap = false;
  let index = 0;
  while (index < lines.length) {
    if (lines[index].trim() === "") {
      index++;
      continue;
    }
    let next = index + 1;
    while (next < lines.length && lines[next].trim() === "") next++;
    if (next >= lines.length) {
      index++;
      continue;
    }
    gaps++;
    if (next - index > 1) {
      doubledGaps++;
      if (hasWrappedLineAcrossGap(lines, index, next, lineThreshold)) {
        hasWrappedDoubleGap = true;
      }
    }
    index = next;
  }
  return gaps >= 2 && doubledGaps / gaps >= 0.9 && hasWrappedDoubleGap;
};

const undoDoubleSpacing = (value: string) =>
  looksDoubleSpaced(value) ? value.replace(/\n+/g, "\n") : value;

const SECTION_DEFINITIONS: Array<{
  key: SyllabusSectionKey;
  pattern: RegExp;
}> = [
  {
    key: "description",
    pattern: /^(?:課程(?:簡介|說明)|course\s+description)/iu,
  },
  { key: "textbooks", pattern: /^(?:指定用書|text\s*books?)/iu },
  { key: "references", pattern: /^(?:參考書籍|references?)/iu },
  { key: "method", pattern: /^(?:教學方式|teaching\s+methods?)/iu },
  { key: "schedule", pattern: /^(?:教學進度|course\s+schedule|syllabus)/iu },
  { key: "evaluation", pattern: /^(?:成績考核|evaluation)/iu },
  {
    key: "links",
    pattern: /^(?:可連結之網頁|課程相關網站|course[- ]related\s+website)/iu,
  },
  {
    key: "ai",
    pattern:
      /^(?:生成式?\s*AI|AI\s*使用|AI\s+(?:usage|use|guideline|policy))/iu,
  },
];

const parseSectionHeading = (line: string) => {
  const trimmed = line.trim();
  const { text: withoutMarker, markerLength } = removeHeadingMarker(
    trimmed,
    false,
  );
  const definition = SECTION_DEFINITIONS.find(({ pattern }) =>
    pattern.test(withoutMarker),
  );
  if (!definition) return undefined;

  const hasRecognizedMarker = markerLength > 0;
  const isPlainKnownHeading = definition.pattern.test(withoutMarker);
  if (!hasRecognizedMarker && !isPlainKnownHeading) return undefined;

  const separator = withoutMarker.search(SECTION_SEPARATOR);
  if (separator >= 0 && separator < 120) {
    return {
      key: definition.key,
      title: trimmed.slice(0, markerLength + separator + 1).trimEnd(),
      inlineBody: withoutMarker.slice(separator + 1).trimStart(),
    };
  }
  return { key: definition.key, title: trimmed, inlineBody: "" };
};

const hasTableLayout = (lines: string[]) => {
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length < 2) return false;
  if (nonEmptyLines.some((line) => line.includes("\t"))) return true;
  const alignedLines = nonEmptyLines.filter((line) => / {3,}/u.test(line));
  return alignedLines.length / nonEmptyLines.length >= 0.5;
};

const hasScheduleLayout = (lines: string[]) =>
  lines.filter((line) =>
    /^\s*(?:week\s+\d+|第\s*\d+\s*週)(?:\s|$)/iu.test(line),
  ).length >= 2;

const normalizeHeadingIdentity = (value: string) =>
  value.replace(/\s+/gu, "").replace(/[：:]/gu, "").toLocaleLowerCase("zh-TW");

const splitSections = (value: string) => {
  const lines = value.split("\n");
  const detectedHeadings = lines.flatMap((line, index) => {
    const heading = parseSectionHeading(line);
    return heading ? [{ ...heading, index }] : [];
  });
  const headings = detectedHeadings.filter((heading, headingIndex) => {
    const previous = detectedHeadings[headingIndex - 1];
    if (!previous) return true;
    const onlyBlankLinesBetween = lines
      .slice(previous.index + 1, heading.index)
      .every((line) => line.trim() === "");
    return !(
      onlyBlankLinesBetween &&
      normalizeHeadingIdentity(previous.title) ===
        normalizeHeadingIdentity(heading.title)
    );
  });
  if (headings.length === 0) {
    return [{ key: "other" as const, title: "", body: value }];
  }

  const sections: SyllabusSection[] = [];
  const leadingBody = lines.slice(0, headings[0].index).join("\n").trim();
  if (leadingBody) {
    sections.push({
      key: "other",
      title: "",
      body: leadingBody,
    });
  }
  headings.forEach((heading, headingIndex) => {
    const end = headings[headingIndex + 1]?.index ?? lines.length;
    const bodyLines = lines.slice(heading.index + 1, end);
    if (heading.inlineBody) bodyLines.unshift(heading.inlineBody);
    sections.push({
      key: heading.key,
      title: heading.title,
      body: bodyLines.join("\n").trim(),
    });
  });
  return sections;
};

const cleanSectionBodies = (
  sections: SyllabusSection[],
  cleanDoubleSpacing: boolean,
) =>
  sections.map((section) => {
    if (
      section.key === "schedule" ||
      hasTableLayout(section.body.split("\n")) ||
      hasScheduleLayout(section.body.split("\n"))
    ) {
      return section;
    }
    const body = cleanDoubleSpacing
      ? undoDoubleSpacing(section.body)
      : section.body;
    return {
      ...section,
      body: unwrapHardWrappedText(body),
    };
  });

const rebuildSections = (sections: SyllabusSection[]) =>
  sections
    .map(({ title, body }) => (body ? `${title}\n${body}` : title))
    .join("\n")
    .trim();

const stripLeadingKeywordParagraph = (value: string) => {
  const label = /^\s*Course\s+keywords\s*:/iu.exec(value);
  if (!label) return value;
  const suffix = value.slice(label[0].length);
  const separator = /^.*?( {4,})/su.exec(suffix);
  if (!separator) return value;
  return suffix.slice(separator[0].length).replace(/^(?:[ \t]*\n)+/u, "");
};

const consumeKeywordLabel = (value: string, start: number) => {
  const label = "course keywords";
  let cursor = skipWhitespace(value, start);
  if (value.slice(cursor, cursor + label.length).toLowerCase() !== label) {
    return undefined;
  }
  cursor = skipWhitespace(value, cursor + label.length);
  if (value[cursor] !== ":") return undefined;
  return skipWhitespace(value, cursor + 1);
};

const stripLeadingKeywordLabels = (value: string) => {
  let cursor = 0;
  while (true) {
    const next = consumeKeywordLabel(value, cursor);
    if (next === undefined) return value.slice(cursor);
    cursor = next;
  }
};

const stripOneLeadingKeywordLabel = (value: string) => {
  const next = consumeKeywordLabel(value, 0);
  return next === undefined ? value : value.slice(next);
};

const stripMarkupTags = (value: string) => {
  let output = "";
  let textStart = 0;
  let tagStart = -1;
  for (let index = 0; index < value.length; index++) {
    if (tagStart < 0 && value[index] === "<") {
      output += value.slice(textStart, index);
      tagStart = index;
    } else if (tagStart >= 0 && value[index] === ">") {
      tagStart = -1;
      textStart = index + 1;
    }
  }
  return (
    output + (tagStart >= 0 ? value.slice(tagStart) : value.slice(textStart))
  );
};

const stripTrailingPeriods = (value: string) => {
  let end = value.length;
  while (end > 0 && (value[end - 1] === "." || value[end - 1] === "。")) {
    end--;
  }
  return value.slice(0, end);
};

export const cleanKeywords = (
  raw: string[] | string | null | undefined,
): string[] => {
  if (raw == null) return [];
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  const value = stripControls(normalizeLineEndings(decodeEntities(joined)));
  const withoutLabel = stripLeadingKeywordLabels(stripMarkupTags(value));
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const keyword of withoutLabel.split(/[,，、;；\n]+/u)) {
    let cleaned = stripOneLeadingKeywordLabel(keyword).trim();
    cleaned = stripTrailingPeriods(cleaned).trim();
    if (!cleaned) continue;
    const identity = cleaned.toLocaleLowerCase("zh-TW");
    if (seen.has(identity)) continue;
    seen.add(identity);
    keywords.push(cleaned);
  }
  return keywords;
};

export const cleanBrief = (raw: string | null | undefined): string | null => {
  if (raw == null) return null;
  const prepared = collapseExcessiveBreaks(undoDoubleSpacing(prepareText(raw)));
  const value = unwrapHardWrappedText(prepared);
  return value.trim() || null;
};

export const cleanContent = (
  raw: string | null | undefined,
): CleanSyllabusContent => {
  if (raw == null) return { text: null, sections: [] };
  let value = prepareText(raw, true, false);
  value = stripLeadingKeywordParagraph(value);
  value = trimTrailingWhitespace(value);
  value = collapseExcessiveBreaks(value).trim();
  if (!value || value === "尚未提供") return { text: null, sections: [] };

  const sections = splitSections(value);
  const cleanedSections = cleanSectionBodies(
    sections,
    looksDoubleSpaced(value),
  );
  const text = rebuildSections(cleanedSections) || null;
  return { text, sections: text ? cleanedSections : [] };
};
