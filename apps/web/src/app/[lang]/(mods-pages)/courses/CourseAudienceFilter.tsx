import {
  courseAudienceFacetValue,
  type CourseAudienceTag,
  type CourseAudienceTagValue,
} from "@courseweb/shared";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import {
  courseAudienceTagLabel,
  type AudienceLabels,
} from "@/components/CourseDetails/CourseAudienceTags";
import FilterItem, { type RefinementItem } from "./FilterItem";

const AUDIENCE_RELATIONS: readonly CourseAudienceTag["relation"][] = [
  "restriction",
  "exclusion",
  "priority",
];
const AUDIENCE_VALUES: readonly CourseAudienceTagValue[] = [
  "undergraduate",
  "graduate",
  "master",
  "doctoral",
  "own-department",
  "male",
  "female",
  "international",
  "year-1",
  "year-2",
  "year-3",
  "year-4",
];
type AcademicLevel = NonNullable<CourseAudienceTag["scope"]>;

const ACADEMIC_LEVELS: readonly AcademicLevel[] = [
  "undergraduate",
  "graduate",
  "master",
  "doctoral",
];
const ACADEMIC_LEVEL_SET = new Set<CourseAudienceTagValue>(ACADEMIC_LEVELS);

const kindForValue = (
  value: CourseAudienceTagValue,
): CourseAudienceTag["kind"] => {
  if (value.startsWith("year-")) return "year";
  if (ACADEMIC_LEVEL_SET.has(value)) return "level";
  if (value === "own-department") return "department";
  return "other";
};

const CourseAudienceFilter = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const labels = dict.course.details.audience_tags as AudienceLabels;
  const audienceSynonyms: Record<string, string> = {};
  const audienceOrder: Record<string, number> = {};
  let order = 0;

  for (const relation of AUDIENCE_RELATIONS) {
    for (const value of AUDIENCE_VALUES) {
      const scopes = value.startsWith("year-")
        ? [undefined, ...ACADEMIC_LEVELS]
        : [undefined];
      for (const scope of scopes) {
        const tag: CourseAudienceTag = {
          kind: kindForValue(value),
          value,
          relation,
          source: "",
          ...(scope ? { scope } : {}),
        };
        const facetValue = courseAudienceFacetValue(tag);
        audienceSynonyms[facetValue] = courseAudienceTagLabel(
          tag,
          labels,
          lang ?? "zh",
        );
        audienceOrder[facetValue] = order++;
      }
    }
  }

  const sortAudience = (left: RefinementItem, right: RefinementItem) =>
    (audienceOrder[left.value] ?? Number.MAX_SAFE_INTEGER) -
    (audienceOrder[right.value] ?? Number.MAX_SAFE_INTEGER);

  return (
    <FilterItem
      attribute="audience"
      title={labels.title}
      limit={100}
      synonms={audienceSynonyms}
      synonymsOnly={true}
      hideWhenEmpty={true}
      sortFn={sortAudience}
    />
  );
};

export default CourseAudienceFilter;
