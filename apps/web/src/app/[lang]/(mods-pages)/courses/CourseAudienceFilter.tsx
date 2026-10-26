import {
  courseAudienceFacetValue,
  type CourseAudienceTag,
} from "@courseweb/shared";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import {
  AUDIENCE_RELATIONS,
  courseAudienceTagCandidates,
  courseAudienceTagLabel,
  type AudienceLabels,
} from "@/components/CourseDetails/CourseAudienceTags";
import ExpandableFilter, {
  type RefinementItem,
} from "../student/planner/course-picker/ExpandableFilter";

const CourseAudienceFilter = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const labels = dict.course.details.audience_tags as AudienceLabels;
  const audienceSynonyms: Record<string, string> = {};
  const audienceOrder: Record<string, number> = {};
  const audienceGroups: Record<string, CourseAudienceTag["relation"]> = {};

  courseAudienceTagCandidates().forEach((tag, order) => {
    const facetValue = courseAudienceFacetValue(tag);
    audienceSynonyms[facetValue] = courseAudienceTagLabel(
      tag,
      labels,
      lang ?? "zh",
    );
    audienceOrder[facetValue] = order;
    audienceGroups[facetValue] = tag.relation;
  });

  const sortAudience = (left: RefinementItem, right: RefinementItem) =>
    (audienceOrder[left.value] ?? Number.MAX_SAFE_INTEGER) -
    (audienceOrder[right.value] ?? Number.MAX_SAFE_INTEGER);

  return (
    <ExpandableFilter
      attribute="audience"
      title={labels.title}
      limit={100}
      synonyms={audienceSynonyms}
      synonymsOnly={true}
      hideWhenEmpty={true}
      hideZeroCount={true}
      sortFn={sortAudience}
      selectedFirst={false}
      groupBy={(item) => audienceGroups[item.value]}
      groupLabels={labels.groups}
      groupOrder={AUDIENCE_RELATIONS}
    />
  );
};

export default CourseAudienceFilter;
