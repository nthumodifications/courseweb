import {
  type CourseAudienceTag,
  type CourseAudienceTagValue,
} from "@courseweb/shared";
import { Badge } from "@courseweb/ui";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

export type AudienceLabels = {
  title: string;
  year_grade: Record<YearValue, string>;
  scoped_years: Record<AcademicLevel, Record<YearValue, string>>;
  undergraduate: string;
  graduate: string;
  master: string;
  doctoral: string;
  own_department: string;
  male: string;
  female: string;
  international: string;
  restriction_suffix: string;
  exclusion_prefix: string;
  priority_suffix: string;
  groups: Record<CourseAudienceTag["relation"], string>;
};

type YearValue = Extract<
  CourseAudienceTagValue,
  "year-1" | "year-2" | "year-3" | "year-4"
>;

type AcademicLevel = NonNullable<CourseAudienceTag["scope"]>;
type NonYearValue = Exclude<CourseAudienceTagValue, YearValue>;
type NonYearLabelKey =
  | "undergraduate"
  | "graduate"
  | "master"
  | "doctoral"
  | "own_department"
  | "international"
  | "male"
  | "female";

export const AUDIENCE_RELATIONS: readonly CourseAudienceTag["relation"][] = [
  "restriction",
  "exclusion",
  "priority",
];

export const ACADEMIC_LEVELS: readonly AcademicLevel[] = [
  "undergraduate",
  "graduate",
  "master",
  "doctoral",
];

const YEAR_VALUES: readonly YearValue[] = [
  "year-1",
  "year-2",
  "year-3",
  "year-4",
];

export const AUDIENCE_VALUES: readonly CourseAudienceTagValue[] = [
  ...ACADEMIC_LEVELS,
  "own-department",
  "international",
  "male",
  "female",
  ...YEAR_VALUES,
];

const NON_YEAR_LABEL_KEYS: Record<NonYearValue, NonYearLabelKey> = {
  undergraduate: "undergraduate",
  graduate: "graduate",
  master: "master",
  doctoral: "doctoral",
  "own-department": "own_department",
  international: "international",
  male: "male",
  female: "female",
};

const kindForValue = (
  value: CourseAudienceTagValue,
): CourseAudienceTag["kind"] => {
  if (value.startsWith("year-")) return "year";
  if (ACADEMIC_LEVELS.includes(value as AcademicLevel)) return "level";
  if (value === "own-department") return "department";
  return "other";
};

const makeAudienceTag = (
  relation: CourseAudienceTag["relation"],
  value: CourseAudienceTagValue,
  scope?: AcademicLevel,
): CourseAudienceTag => ({
  kind: kindForValue(value),
  value,
  relation,
  source: "",
  ...(scope ? { scope } : {}),
});

/** All facet values the parser can emit, in the order used by the filter. */
export const courseAudienceTagCandidates = (): CourseAudienceTag[] => {
  const orderedValues: Array<{
    value: CourseAudienceTagValue;
    scope?: AcademicLevel;
  }> = [
    ...ACADEMIC_LEVELS.map((value) => ({ value })),
    ...ACADEMIC_LEVELS.flatMap((scope) =>
      YEAR_VALUES.map((value) => ({ value, scope })),
    ),
    ...YEAR_VALUES.map((value) => ({ value })),
    { value: "own-department" },
    { value: "international" },
    { value: "male" },
    { value: "female" },
  ];

  return AUDIENCE_RELATIONS.flatMap((relation) =>
    orderedValues.map(({ value, scope }) =>
      makeAudienceTag(relation, value, scope),
    ),
  );
};

const valueLabel = (
  value: CourseAudienceTagValue,
  labels: AudienceLabels,
): string => {
  if (value.startsWith("year-")) return labels.year_grade[value as YearValue];
  return labels[NON_YEAR_LABEL_KEYS[value as NonYearValue]];
};

export const courseAudienceTagLabel = (
  tag: CourseAudienceTag,
  labels: AudienceLabels,
  language: string,
) => {
  const separator = language === "en" ? " " : "";
  const label =
    tag.kind === "year" && tag.scope
      ? labels.scoped_years[tag.scope][tag.value as YearValue]
      : valueLabel(tag.value, labels);

  if (tag.relation === "exclusion") {
    const exclusionLabel =
      language === "en"
        ? label.charAt(0).toLowerCase() + label.slice(1)
        : label;
    return `${labels.exclusion_prefix}${separator}${exclusionLabel}`;
  }
  if (tag.relation === "priority")
    return `${label}${separator}${labels.priority_suffix}`;
  return `${label}${separator}${labels.restriction_suffix}`;
};

const CourseAudienceTags = ({
  tags,
}: {
  tags: readonly CourseAudienceTag[];
}) => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  if (tags.length === 0) return null;

  const labels = dict.course.details.audience_tags as AudienceLabels;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-bold text-base">{labels.title}</h3>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const label = courseAudienceTagLabel(tag, labels, lang ?? "zh");
          return (
            <Badge
              key={`${tag.relation}-${tag.value}-${tag.scope ?? ""}`}
              variant="outline"
              className="font-normal"
              title={`${label}: ${tag.source}`}
              aria-label={`${label}: ${tag.source}`}
            >
              {label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default CourseAudienceTags;
