import { describe, expect, test } from "bun:test";
import {
  courseAudienceFacetValue,
  type CourseAudienceTag,
} from "@courseweb/shared";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";
import zhCn from "@/dictionaries/zh-hans.json";
import {
  ACADEMIC_LEVELS,
  AUDIENCE_RELATIONS,
  AUDIENCE_VALUES,
  courseAudienceTagCandidates,
  courseAudienceTagLabel,
  type AudienceLabels,
} from "./CourseAudienceTags";

const dictionaries = [
  ["zh-TW", zh.course.details.audience_tags],
  ["en", en.course.details.audience_tags],
  ["zh-CN", zhCn.course.details.audience_tags],
] as const;

const candidateTags = courseAudienceTagCandidates();

describe("course audience labels", () => {
  test("enumerates every parser facet shape", () => {
    for (const relation of AUDIENCE_RELATIONS) {
      for (const value of AUDIENCE_VALUES) {
        const matches = candidateTags.filter(
          (tag) => tag.relation === relation && tag.value === value,
        );
        expect(matches, `${relation}:${value}`).toHaveLength(
          value.startsWith("year-") ? ACADEMIC_LEVELS.length + 1 : 1,
        );
      }
    }

    expect(new Set(candidateTags.map(courseAudienceFacetValue)).size).toBe(
      candidateTags.length,
    );
  });

  test.each(dictionaries)(
    "has unique labels for every facet value in %s",
    (language, dictionary) => {
      const labels = candidateTags.map((tag) =>
        courseAudienceTagLabel(
          tag,
          dictionary as AudienceLabels,
          language === "zh-TW" ? "zh" : language,
        ),
      );
      const duplicates = labels.filter(
        (label, index) => labels.indexOf(label) !== index,
      );

      expect(duplicates).toEqual([]);
    },
  );

  test.each(dictionaries)(
    "keeps grade-only, scoped, and level labels distinct in %s",
    (language, dictionary) => {
      const labels = dictionary as AudienceLabels;
      const locale = language === "zh-TW" ? "zh" : language;
      const tag = (
        relation: CourseAudienceTag["relation"],
        value: CourseAudienceTag["value"],
        scope?: CourseAudienceTag["scope"],
      ): CourseAudienceTag => ({
        kind: value.startsWith("year-")
          ? "year"
          : value === "own-department"
            ? "department"
            : ACADEMIC_LEVELS.includes(
                  value as (typeof ACADEMIC_LEVELS)[number],
                )
              ? "level"
              : "other",
        value,
        relation,
        source: "",
        ...(scope ? { scope } : {}),
      });

      expect(
        courseAudienceTagLabel(tag("restriction", "year-1"), labels, locale),
      ).toBe(
        language === "en"
          ? "Year 1 only"
          : language === "zh-TW"
            ? "一年級限定"
            : "一年级限定",
      );
      expect(
        courseAudienceTagLabel(
          tag("restriction", "year-1", "undergraduate"),
          labels,
          locale,
        ),
      ).toBe(
        language === "en"
          ? "Undergraduate Year 1 only"
          : language === "zh-TW"
            ? "大一限定"
            : "大一限定",
      );
      expect(
        courseAudienceTagLabel(
          tag("restriction", "year-1", "master"),
          labels,
          locale,
        ),
      ).toBe(
        language === "en"
          ? "Master's Year 1 only"
          : language === "zh-TW"
            ? "碩一限定"
            : "硕一限定",
      );
      expect(
        courseAudienceTagLabel(tag("restriction", "master"), labels, locale),
      ).toBe(
        language === "en"
          ? "Master's only"
          : language === "zh-TW"
            ? "碩士班限定"
            : "硕士班限定",
      );
      expect(
        courseAudienceTagLabel(
          tag("exclusion", "undergraduate"),
          labels,
          locale,
        ),
      ).toBe(
        language === "en"
          ? "Excludes undergraduates"
          : language === "zh-TW"
            ? "排除大學部"
            : "排除大学部",
      );
      expect(
        courseAudienceTagLabel(
          tag("priority", "undergraduate"),
          labels,
          locale,
        ),
      ).toBe(
        language === "en"
          ? "Undergraduates first"
          : language === "zh-TW"
            ? "大學部優先"
            : "大学部优先",
      );
    },
  );
});
