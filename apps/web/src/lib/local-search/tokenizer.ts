import {
  searchableFieldValues,
  searchableFields,
  type SearchProjectionRecord,
} from "./projection";

export const isCjkCharacter = (character: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
    character,
  );

const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character);
export const isCodeLikeTerm = (value: string) =>
  /^[A-Z0-9]+$/i.test(value) && (/[A-Z]/.test(value) || /\d/.test(value));

export type CourseCodeQuery = {
  semester?: string;
  department: string;
  digits: string;
};

/** Parse a department/course code with optional semester and section digits. */
export const parseCourseCodeQuery = (
  query: string,
): CourseCodeQuery | undefined => {
  const compact = query.normalize("NFKC").replace(/\s+/g, "");
  const match = compact.match(/^(?:(\d{5}))?([A-Z]+)(\d+)$/i);
  if (!match) return undefined;
  return {
    semester: match[1],
    department: match[2]!.toLocaleUpperCase("en-US"),
    digits: match[3]!,
  };
};

export const isSemesterOnlyQuery = (query: string) =>
  /^\d{5}$/.test(query.normalize("NFKC").trim());

const ordinalPattern = /(?:[一二三四五六七八九十]+|I{1,3})$/iu;
const leadingOrdinalPattern = /^(?:[一二三四五六七八九十]+|I{1,3})/iu;
const MAX_ORDINAL_GAP = 3;

const hasShortGapOrdinal = (value: string, term: string): boolean => {
  const normalizedValue = value.normalize("NFKC").toLocaleLowerCase("zh-TW");
  const normalizedTerm = term.normalize("NFKC").toLocaleLowerCase("zh-TW");
  const trailing = normalizedTerm.match(ordinalPattern);
  if (trailing && trailing.index !== undefined) {
    const core = normalizedTerm.slice(0, trailing.index);
    const ordinal = trailing[0];
    let start = normalizedValue.indexOf(core);
    while (start >= 0) {
      const ordinalStart = normalizedValue.indexOf(
        ordinal,
        start + core.length,
      );
      if (
        ordinalStart >= 0 &&
        ordinalStart - (start + core.length) <= MAX_ORDINAL_GAP
      ) {
        return true;
      }
      start = normalizedValue.indexOf(core, start + 1);
    }
  }

  const leading = normalizedTerm.match(leadingOrdinalPattern);
  if (leading && leading[0].length < normalizedTerm.length) {
    const ordinal = leading[0];
    const core = normalizedTerm.slice(ordinal.length);
    const ordinalStart = normalizedValue.indexOf(ordinal);
    while (ordinalStart >= 0) {
      const coreStart = normalizedValue.indexOf(
        core,
        ordinalStart + ordinal.length,
      );
      if (
        coreStart >= 0 &&
        coreStart - (ordinalStart + ordinal.length) <= MAX_ORDINAL_GAP
      ) {
        return true;
      }
      const nextStart = normalizedValue.indexOf(ordinal, ordinalStart + 1);
      if (nextStart < 0) break;
      return hasShortGapOrdinal(
        normalizedValue.slice(nextStart),
        normalizedTerm,
      );
    }
  }
  return false;
};

export const cjkTermMatchScore = (value: string, term: string) => {
  const normalizedValue = value.normalize("NFKC").toLocaleLowerCase("zh-TW");
  const normalizedTerm = term.normalize("NFKC").toLocaleLowerCase("zh-TW");
  if (normalizedValue === normalizedTerm) return 3;
  if (normalizedValue.startsWith(normalizedTerm)) return 2;
  if (normalizedValue.includes(normalizedTerm)) return 1;
  return hasShortGapOrdinal(normalizedValue, normalizedTerm) ? 1 : 0;
};

export const needsShortGapCjkRecall = (query: string) =>
  queryTerms(query).some(
    (term) =>
      [...term].some(isCjkCharacter) &&
      (ordinalPattern.test(term) || leadingOrdinalPattern.test(term)),
  );

export const matchesCourseCode = (
  record: SearchProjectionRecord,
  query: CourseCodeQuery,
) => {
  const department = record.department
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleUpperCase("en-US");
  const course = record.course.normalize("NFKC").replace(/\D/g, "");
  return (
    department === query.department &&
    (course.startsWith(query.digits) || query.digits.startsWith(course))
  );
};

/**
 * FlexSearch's forward tokenizer does not segment Chinese by itself. Index
 * CJK unigrams for single-character lookup and adjacent bigrams for contiguous
 * multi-character lookup, while keeping Latin/numeric runs intact for course
 * codes and department prefixes.
 */
export const tokenizeCjk = (value: unknown): string[] => {
  const text = String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-TW");
  const tokens: string[] = [];
  let word = "";
  let cjkRun = "";
  const flush = () => {
    if (word) tokens.push(word);
    word = "";
  };
  const flushCjk = () => {
    if (cjkRun) {
      for (const character of cjkRun) tokens.push(character);
      for (let i = 0; i + 1 < cjkRun.length; i += 1) {
        tokens.push(cjkRun.slice(i, i + 2));
      }
    }
    cjkRun = "";
  };

  for (const character of text) {
    if (isCjkCharacter(character)) {
      flush();
      cjkRun += character;
    } else if (isWordCharacter(character)) {
      flushCjk();
      word += character;
    } else {
      flushCjk();
      flush();
    }
  }
  flushCjk();
  flush();
  return tokens;
};

/** Apply only deterministic word-form normalization; this is not fuzzy search. */
export const normalizeLatinWord = (value: string) => {
  const preservesCodeForm = isCodeLikeTerm(value);
  const word = value.toLocaleLowerCase("zh-TW");
  if (!/^[a-z]+$/.test(word) || word.length < 4) return word;
  if (preservesCodeForm) return word;
  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (/(?:xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !/(?:ss|us|is|ics)$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
};

export const queryTerms = (query: string) =>
  query
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((term) => {
      // CJK phrases remain one query term so the final matcher can require
      // the same contiguous phrase as the remote fallback.
      return [...term].some(isCjkCharacter)
        ? [term.toLocaleLowerCase("zh-TW")]
        : tokenizeCjk(term).map((token) =>
            normalizeLatinWord(isCodeLikeTerm(term) ? term : token),
          );
    });

/** Query text sent to FlexSearch after the same light word-form normalization. */
export const normalizeSearchQuery = (query: string) =>
  queryTerms(query).join(" ");

const tokenGroupsCache = new WeakMap<SearchProjectionRecord, string[][]>();
const latinTokenGroupsCache = new WeakMap<SearchProjectionRecord, string[][]>();

/** Tokenized searchable values grouped by SEARCHABLE_FIELDS for fast checks/ranking. */
export const searchableTokenGroups = (record: SearchProjectionRecord) => {
  const cached = tokenGroupsCache.get(record);
  if (cached) return cached;
  const groups = searchableFieldValues(record).map((values) =>
    values.flatMap((value) => tokenizeCjk(value)),
  );
  tokenGroupsCache.set(record, groups);
  return groups;
};

/** Latin-only token groups retained for callers that need raw word runs. */
export const searchableLatinTokenGroups = (record: SearchProjectionRecord) => {
  const cached = latinTokenGroupsCache.get(record);
  if (cached) return cached;
  const groups = searchableFieldValues(record).map((values) =>
    values.flatMap((value) => value.split(/[^\p{L}\p{N}]+/u).filter(Boolean)),
  );
  latinTokenGroupsCache.set(record, groups);
  return groups;
};

export const matchesLocalQueryTerms = (
  record: SearchProjectionRecord,
  terms: readonly string[],
  options: {
    allowShortLatinPrefixes?: boolean;
    courseCode?: CourseCodeQuery;
  } = {},
) => {
  if (!terms.length) return true;
  if (terms.length === 1 && isSemesterOnlyQuery(terms[0]!)) return false;
  if (options.courseCode && matchesCourseCode(record, options.courseCode)) {
    return true;
  }
  const allowShortLatinPrefixes = options.allowShortLatinPrefixes ?? true;
  const fields = searchableFields(record);
  const tokenGroups = searchableTokenGroups(record);
  return terms.every((term) => {
    if ([...term].some(isCjkCharacter)) {
      return fields.some((field) => cjkTermMatchScore(field, term) > 0);
    }
    return tokenGroups.some((tokens) =>
      tokens.some(
        (token) =>
          token === term ||
          (term.length === 2 &&
            allowShortLatinPrefixes &&
            token.startsWith(term)) ||
          (term.length >= 3 && token.startsWith(term)) ||
          (term.length === 1 && token.startsWith(term)),
      ),
    );
  });
};

export const matchesLocalQuery = (
  record: SearchProjectionRecord,
  query: string,
) => {
  const terms = queryTerms(query);
  return matchesLocalQueryTerms(record, terms, {
    allowShortLatinPrefixes: !query.trim().split(/\s+/).some(isCodeLikeTerm),
    courseCode: parseCourseCodeQuery(query),
  });
};
