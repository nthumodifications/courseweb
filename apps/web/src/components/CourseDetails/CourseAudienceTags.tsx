import {
  type CourseAudienceTag,
  type CourseAudienceTagValue,
} from "@courseweb/shared";
import { Badge } from "@courseweb/ui";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

type AudienceLabels = {
  title: string;
  year_1: string;
  year_2: string;
  year_3: string;
  year_4: string;
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
  year_numbers: Record<string, string>;
};

type YearValue = Extract<
  CourseAudienceTagValue,
  "year-1" | "year-2" | "year-3" | "year-4"
>;

const valueLabel = (
  value: CourseAudienceTagValue,
  labels: AudienceLabels,
): string => {
  if (value.startsWith("year-")) {
    const key = `year_${value.slice(-1)}` as `year_${1 | 2 | 3 | 4}`;
    return labels[key];
  }

  const key = value.replace("-", "_") as Exclude<
    keyof AudienceLabels,
    | "title"
    | "restriction_suffix"
    | "exclusion_prefix"
    | "priority_suffix"
    | "year_numbers"
    | `year_${1 | 2 | 3 | 4}`
  >;
  return labels[key];
};

const tagLabel = (
  tag: CourseAudienceTag,
  labels: AudienceLabels,
  language: string,
) => {
  const separator = language === "en" ? " " : "";
  let label = valueLabel(tag.value, labels);

  if (tag.kind === "year" && tag.scope && tag.scope !== "undergraduate") {
    const yearKey = tag.value as YearValue;
    label = `${valueLabel(tag.scope, labels)}${separator}${labels.year_numbers[yearKey]}`;
  }

  if (tag.relation === "exclusion")
    return `${labels.exclusion_prefix}${separator}${label}`;
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
          const label = tagLabel(tag, labels, lang ?? "zh");
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
