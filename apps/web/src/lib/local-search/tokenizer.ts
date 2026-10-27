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
  /^[A-Z0-9]+$/.test(value) && /[A-Z]/.test(value);

/**
 * FlexSearch's forward tokenizer does not segment Chinese by itself. Index
 * CJK unigrams for single-character lookup and adjacent bigrams for contiguous
 * multi-character lookup, while keeping Latin/numeric runs intact for course
 * codes and department prefixes.
 */
export const tokenizeCjk = (value: unknown): string[] => {
  const text = String(value ?? "").toLocaleLowerCase("zh-TW");
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
  const preservesCodeForm = /^[A-Z0-9]+$/.test(value) && /[A-Z]/.test(value);
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
  options: { allowShortLatinPrefixes?: boolean } = {},
) => {
  if (!terms.length) return true;
  const allowShortLatinPrefixes = options.allowShortLatinPrefixes ?? true;
  const fields = searchableFields(record);
  const tokenGroups = searchableTokenGroups(record);
  return terms.every((term) => {
    if ([...term].some(isCjkCharacter)) {
      return fields.some((field) => field.includes(term));
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
) =>
  matchesLocalQueryTerms(record, queryTerms(query), {
    allowShortLatinPrefixes: !query.trim().split(/\s+/).some(isCodeLikeTerm),
  });
