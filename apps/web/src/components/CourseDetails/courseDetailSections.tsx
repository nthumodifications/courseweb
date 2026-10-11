import type { ReactNode } from "react";

export const COURSE_DETAIL_SECTION_REGISTRY = [
  { id: "header" },
  { id: "actions" },
  { id: "overall-grade-summary" },
  { id: "syllabus-summary" },
  { id: "syllabus-brief" },
  { id: "syllabus-description" },
  { id: "prerequisites" },
  { id: "ptt-reviews" },
  { id: "current-scores" },
  { id: "historical-grade-statistics" },
  { id: "same-code-courses" },
  { id: "toc" },
  { id: "offering-history" },
  { id: "remarks" },
  { id: "restrictions" },
  { id: "compulsory-membership" },
  { id: "elective-membership" },
  { id: "first-specialization-membership" },
  { id: "second-specialization-membership" },
  { id: "updated-at" },
] as const;

export type CourseDetailSectionId =
  (typeof COURSE_DETAIL_SECTION_REGISTRY)[number]["id"];

// Keep exclusions as objects so a future dialog-only omission must explain why.
export const COURSE_DETAIL_DIALOG_EXCLUSIONS: readonly {
  id: CourseDetailSectionId;
  reason: string;
}[] = [];

export const COURSE_DETAIL_SECTION_IDS = COURSE_DETAIL_SECTION_REGISTRY.map(
  ({ id }) => id,
) as CourseDetailSectionId[];

export const COURSE_DETAIL_DIALOG_EXCLUDED_SECTION_IDS =
  COURSE_DETAIL_DIALOG_EXCLUSIONS.map(({ id }) => id);

export const getCourseDetailDialogSectionIds = () =>
  COURSE_DETAIL_SECTION_REGISTRY.filter(
    ({ id }) => !COURSE_DETAIL_DIALOG_EXCLUDED_SECTION_IDS.includes(id),
  ).map(({ id }) => id);

export const isRegisteredCourseDetailSection = (
  id: string,
): id is CourseDetailSectionId =>
  COURSE_DETAIL_SECTION_REGISTRY.some((section) => section.id === id);

/** The page and dialog share these marker wrappers and therefore this registry. */
export const CourseDetailSection = ({
  id,
  children,
}: {
  id: CourseDetailSectionId;
  children: ReactNode;
}) => (
  <div data-course-detail-section={id} className="contents">
    {children}
  </div>
);
