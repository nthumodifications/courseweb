import {
  cleanBrief,
  cleanContent,
  cleanKeywords,
  type CleanSyllabusContent,
} from "@courseweb/shared";

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

export type { CleanSyllabusContent };
