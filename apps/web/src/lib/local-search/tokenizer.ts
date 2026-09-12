import { searchableFields, type SearchProjectionRecord } from "./projection";

const isCjk = (character: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
    character,
  );

const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character);

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
    if (isCjk(character)) {
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

export const queryTerms = (query: string) =>
  query
    .toLocaleLowerCase("zh-TW")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((term) => {
      // A complete CJK phrase is checked contiguously by matchesLocalQuery.
      // FlexSearch still gets the same unigram/bigram encoded query.
      return [...term].some(isCjk) ? [term] : tokenizeCjk(term);
    });

export const matchesLocalQuery = (
  record: SearchProjectionRecord,
  query: string,
) => {
  const terms = queryTerms(query);
  if (!terms.length) return true;
  const fields = searchableFields(record);
  return terms.every((term) => {
    if ([...term].some(isCjk)) {
      return fields.some((field) => field.includes(term));
    }
    return fields.some((field) =>
      tokenizeCjk(field).some((token) => token.startsWith(term)),
    );
  });
};
