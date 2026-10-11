import { describe, expect, test } from "bun:test";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";

process.env.VITE_COURSEWEB_API_URL ??= "https://api.example.test";
const { buildCourseProviderJsonLd } = await import("./CourseDetailsContainer");

describe("course provider JSON-LD", () => {
  test("renders the exact provider value for each language", () => {
    expect(
      JSON.stringify(
        buildCourseProviderJsonLd(
          en.course.details.seo.provider_alternate_name,
        ),
      ),
    ).toBe(
      '{"@type":"EducationalOrganization","name":"National Tsing Hua University","alternateName":"國立清華大學","url":"https://www.nthu.edu.tw"}',
    );
    expect(
      JSON.stringify(
        buildCourseProviderJsonLd(
          zh.course.details.seo.provider_alternate_name,
        ),
      ),
    ).toBe(
      '{"@type":"EducationalOrganization","name":"National Tsing Hua University","alternateName":"國立清華大學","url":"https://www.nthu.edu.tw"}',
    );
  });
});
