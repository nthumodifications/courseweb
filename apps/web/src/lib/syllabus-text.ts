import { cleanBrief, cleanContent, cleanKeywords } from "@courseweb/shared";
export type { CleanSyllabusContent } from "@courseweb/shared";

const isPrimitive = (
  value: unknown,
): value is string | number | boolean | bigint | symbol =>
  value !== null &&
  (typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol");

export const normalizeSyllabusKeywords = (
  value: unknown,
): string[] | string | null => {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.filter(isPrimitive).map(String);
  }
  return isPrimitive(value) ? String(value) : null;
};

type SyllabusFields = {
  brief?: string | null;
  keywords?: string[] | string | null;
  content?: string | null;
};

export const cleanSyllabusFields = (
  value: SyllabusFields | null | undefined,
) => ({
  brief: cleanBrief(value?.brief),
  keywords: value?.keywords == null ? null : cleanKeywords(value.keywords),
  content: cleanContent(value?.content),
});
