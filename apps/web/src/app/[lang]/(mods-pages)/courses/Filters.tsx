import { useState } from "react";
import { useRefinementList } from "react-instantsearch";
import { departments, GETargetCodes } from "@courseweb/shared";
import ExpandableClassFilter from "../student/planner/course-picker/ExpandableClassFilter";
import ExpandableFilter from "../student/planner/course-picker/ExpandableFilter";
import InlineCheckboxFilter from "../student/planner/course-picker/InlineCheckboxFilter";
import useCustomRefinementList from "./useCustomRefinementList";
import TimeSelectionFilter from "./TimeSelectionFilter";
import CourseAudienceFilter from "./CourseAudienceFilter";
import { MinimalCourse } from "@/types/courses";
import useDictionary from "@/dictionaries/useDictionary";
import { countActiveRefinementValues } from "./courseSearchView";

export const FILTER_SECTION_IDS = [
  "compulsory",
  "department",
  "level",
  "audience",
  "time",
  "tags",
  "language",
  "ge_target",
  "ge_type",
  "venues",
  "first_specialization",
  "second_specialization",
  "cross_discipline",
] as const;

export type FilterSectionId = (typeof FILTER_SECTION_IDS)[number];

export const PRIMARY_FILTER_SECTION_IDS = [
  "compulsory",
  "department",
  "time",
  "language",
  "ge_target",
  "level",
] as const satisfies readonly FilterSectionId[];

export const MORE_FILTER_SECTION_IDS = [
  "audience",
  "tags",
  "ge_type",
  "venues",
  "first_specialization",
  "second_specialization",
  "cross_discipline",
] as const satisfies readonly FilterSectionId[];

export type FilterSectionCounts = Record<FilterSectionId, number>;
type SectionPreferences<T extends string> = Partial<Record<T, boolean>>;

const readSectionPreferences = <T extends string>(
  sectionIds: readonly T[],
  storageKey: string,
): SectionPreferences<T> => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          sectionIds.includes(key as T) && typeof value === "boolean",
      ),
    ) as SectionPreferences<T>;
  } catch {
    return {};
  }
};

const persistSectionPreferences = <T extends string>(
  storageKey: string,
  preferences: SectionPreferences<T>,
) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Keep the accordion usable when storage is unavailable.
  }
};

const languageSynonyms: Record<string, string> = {
  中: "Chinese",
  英: "English",
};
const departmentSynonyms: Record<string, string> = departments.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.code} ${v.name_zh}` }),
  {},
);
const geTargetSynonyms: Record<string, string> = GETargetCodes.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.short_en} ${v.short_zh}` }),
  {},
);

// Courses without a GE target index an empty facet value; hide that row.
const withoutBlankValues = <T extends { value: string }>(items: T[]) =>
  items.filter((item) => item.value.trim() !== "");

export const FILTER_ATTRIBUTES: Record<FilterSectionId, string> = {
  compulsory: "for_class",
  department: "department",
  level: "courseLevel",
  audience: "audience",
  time: "separate_times",
  tags: "tags",
  language: "language",
  ge_target: "ge_target",
  ge_type: "ge_type",
  venues: "venues",
  first_specialization: "first_specialization",
  second_specialization: "second_specialization",
  cross_discipline: "cross_discipline",
};

export const useCourseFilterCounts = (): FilterSectionCounts => {
  const { items: classItems } = useCustomRefinementList({
    attribute: FILTER_ATTRIBUTES.compulsory,
    limit: 20,
  });
  const departmentCount = useRefinementCount(FILTER_ATTRIBUTES.department);
  const levelCount = useRefinementCount(FILTER_ATTRIBUTES.level);
  const audienceCount = useRefinementCount(FILTER_ATTRIBUTES.audience);
  const timeCount = useRefinementCount(FILTER_ATTRIBUTES.time);
  const tagsCount = useRefinementCount(FILTER_ATTRIBUTES.tags);
  const languageCount = useRefinementCount(FILTER_ATTRIBUTES.language);
  const geTargetCount = useRefinementCount(FILTER_ATTRIBUTES.ge_target);
  const geTypeCount = useRefinementCount(FILTER_ATTRIBUTES.ge_type);
  const venuesCount = useRefinementCount(FILTER_ATTRIBUTES.venues);
  const firstSpecializationCount = useRefinementCount(
    FILTER_ATTRIBUTES.first_specialization,
  );
  const secondSpecializationCount = useRefinementCount(
    FILTER_ATTRIBUTES.second_specialization,
  );
  const crossDisciplineCount = useRefinementCount(
    FILTER_ATTRIBUTES.cross_discipline,
  );

  return {
    compulsory: countActiveRefinementValues(classItems),
    department: departmentCount,
    level: levelCount,
    audience: audienceCount,
    time: timeCount,
    tags: tagsCount,
    language: languageCount,
    ge_target: geTargetCount,
    ge_type: geTypeCount,
    venues: venuesCount,
    first_specialization: firstSpecializationCount,
    second_specialization: secondSpecializationCount,
    cross_discipline: crossDisciplineCount,
  };
};

const useRefinementCount = (attribute: string) => {
  const { items } = useRefinementList({ attribute, limit: 500 });
  return countActiveRefinementValues(items);
};

export const useFilterSectionPreferences = <T extends string>(
  sectionIds: readonly T[],
  counts: Record<T, number>,
  storageKey: string,
) => {
  const [preferences, setPreferences] = useState(() =>
    readSectionPreferences(sectionIds, storageKey),
  );
  const openSections = sectionIds.filter(
    (id) => preferences[id] ?? counts[id] > 0,
  );
  const onOpenChange = (values: string[]) => {
    const next = Object.fromEntries(
      sectionIds.map((id) => [id, values.includes(id)]),
    ) as SectionPreferences<T>;
    const updated = { ...preferences, ...next };
    setPreferences(updated);
    persistSectionPreferences(storageKey, updated);
  };

  return { openSections, onOpenChange };
};

export const getFilterSectionLabel = (
  id: FilterSectionId,
  dict: ReturnType<typeof useDictionary>,
) => {
  switch (id) {
    case "compulsory":
      return dict.course.refine.compulsory_elective;
    case "department":
      return dict.course.refine.department;
    case "level":
      return dict.course.refine.course_level;
    case "audience":
      return dict.course.details.audience_tags.title;
    case "time":
      return dict.course.refine.time;
    case "tags":
      return dict.course.refine.special_tags;
    case "language":
      return dict.course.refine.language;
    case "ge_target":
      return dict.course.refine.geTarget;
    case "ge_type":
      return dict.course.refine.gecDimensions;
    case "venues":
      return dict.course.refine.venues;
    case "first_specialization":
      return dict.course.refine.firstSpecialization;
    case "second_specialization":
      return dict.course.refine.secondSpecialization;
    case "cross_discipline":
      return dict.course.refine.cross_discipline;
  }
};

export const CourseFilterBody = ({
  id,
  selectedCourses,
}: {
  id: FilterSectionId;
  selectedCourses: MinimalCourse[];
}) => {
  const dict = useDictionary();

  switch (id) {
    case "compulsory":
      return <ExpandableClassFilter limit={20} />;
    case "department":
      return (
        <ExpandableFilter
          attribute="department"
          searchable
          limit={500}
          clientSearch
          synonms={departmentSynonyms}
        />
      );
    case "level":
      return <ExpandableFilter attribute="courseLevel" searchable limit={20} />;
    case "audience":
      return <CourseAudienceFilter />;
    case "time":
      return (
        <TimeSelectionFilter
          attribute="separate_times"
          selectedCourses={selectedCourses}
        />
      );
    case "tags":
      return <InlineCheckboxFilter attribute="tags" />;
    case "language":
      return (
        <InlineCheckboxFilter attribute="language" synonms={languageSynonyms} />
      );
    case "ge_target":
      return (
        <InlineCheckboxFilter
          attribute="ge_target"
          synonms={geTargetSynonyms}
          filterFn={withoutBlankValues}
        />
      );
    case "ge_type":
      return (
        <InlineCheckboxFilter
          attribute="ge_type"
          filterFn={(items) =>
            items.filter((item) => item.label.startsWith("核心通識"))
          }
          sortFn={(items) =>
            items.sort((a, b) => a.label.localeCompare(b.label))
          }
        />
      );
    case "venues":
    case "first_specialization":
    case "second_specialization":
    case "cross_discipline":
      return (
        <ExpandableFilter
          attribute={FILTER_ATTRIBUTES[id]}
          searchable
          limit={20}
          placeholder={dict.planner.coursePicker.searchToDisplayMore}
        />
      );
  }
};
