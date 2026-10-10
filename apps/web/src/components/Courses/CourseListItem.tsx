import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, Fragment, memo, ReactNode } from "react";
import CourseTagList from "./CourseTagsList";
import SelectCourseButton from "./SelectCourseButton";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import { ChevronDown, ChevronRight } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import { sanitizeCourseHtml } from "@/lib/sanitizeHtml";
import { cleanSyllabusFields } from "@/lib/syllabus-text";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse } from "@/types/courses";
import { InstructorLink } from "./InstructorLink";
import { pairInstructorNames } from "@/lib/instructors";

// Memoize the CourseListItem component
type CourseListItemCourse = CourseDefinition &
  Partial<Pick<CourseSyllabusView, "brief" | "keywords">>;

type EnglishNamesDisplay = "add" | "replace" | "none";

type CourseListItemProps = {
  course: CourseListItemCourse | null;
  missingCourseId?: string;
  hasTaken?: boolean;
  leading?: ReactNode;
  actions?: ReactNode;
  englishNames?: EnglishNamesDisplay;
  showCourseCode?: boolean;
  showVenue?: boolean;
  showCredits?: boolean;
  showPriority?: boolean;
  showSyllabusDetails?: boolean;
  showEnrollment?: boolean;
  showAdditionalTags?: boolean;
  showChevron?: boolean;
  compact?: boolean;
  alignSideItemsTop?: boolean;
  priority?: number;
  missingTimeLabel?: string;
  dimmed?: boolean;
  onCourseClick?: (courseId: string) => void;
};

const InstructorNames = ({
  names,
  identityNames,
  lang,
}: {
  names: readonly string[];
  identityNames: readonly string[];
  lang: string;
}) => (
  <>
    {names.map((displayName, index) => (
      <Fragment key={`${displayName}-${index}`}>
        {index > 0 ? "," : ""}
        <InstructorLink lang={lang} name={identityNames[index] ?? ""}>
          {displayName}
        </InstructorLink>
      </Fragment>
    ))}
  </>
);

const CourseListItem: FC<CourseListItemProps> = memo((props) => {
  const {
    course,
    missingCourseId,
    hasTaken = false,
    leading,
    actions,
    englishNames,
    showCourseCode = true,
    showVenue = true,
    showCredits = true,
    showPriority = true,
    showSyllabusDetails = true,
    showEnrollment = true,
    showAdditionalTags = true,
    showChevron = true,
    compact = false,
    alignSideItemsTop = false,
    priority,
    missingTimeLabel,
    dimmed = false,
    onCourseClick,
  } = props;
  const dict = useDictionary();
  const { language } = useSettings();
  const { openCourse } = useCourseLink();
  const courseId = course?.raw_id ?? missingCourseId;
  const syllabus = cleanSyllabusFields(course);

  const { setHoverCourse } = useUserTimetable();

  const handleHover = (hovering: boolean) => {
    setHoverCourse(hovering ? course : null);
  };

  const useEnglishTitle =
    englishNames === "replace" ||
    (englishNames !== "add" && englishNames !== "none" && language === "en");
  const bilingualNames = pairInstructorNames(
    course?.teacher_zh,
    course?.teacher_en,
  );
  const titleName = course
    ? useEnglishTitle
      ? course.name_en
      : course.name_zh
    : dict.course.details.favourite_unavailable;
  const titleTeachers = course
    ? useEnglishTitle
      ? (course.teacher_en ?? [])
      : course.teacher_zh
    : [];
  const titleTeacherIdentities = useEnglishTitle
    ? bilingualNames.map(({ nameZh }) => nameZh)
    : titleTeachers;

  return (
    <div
      className={`flex min-w-0 flex-row ${
        compact ? "gap-2 py-0.5" : "gap-4 py-4"
      } @container${dimmed ? " opacity-60" : ""}`}
    >
      {alignSideItemsTop && leading ? (
        <div className="self-start">{leading}</div>
      ) : (
        leading
      )}
      <div className="min-w-0 flex-1">
        <div
          className={`${compact ? "mb-0 space-y-0" : "mb-2 space-y-1"} @md:pt-0`}
        >
          <div className="flex flex-row gap-2 items-center">
            {hasTaken && (
              <div className="flex min-w-[65px] flex-row items-center justify-center rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground select-none">
                {dict.course.details.taken}
              </div>
            )}
            {showCourseCode && (
              <p className="text-nthu-500 text-sm font-bold">
                {course
                  ? `${course.department} ${course.course}${course.class.padStart(2, "0")}`
                  : missingCourseId}
              </p>
            )}
          </div>
          <div className="flex min-w-0 max-w-full flex-row items-start text-left">
            <button
              className="flex min-w-0 max-w-full flex-row items-start gap-1 text-left font-bold hover:underline cursor-pointer"
              onClick={() => {
                if (!courseId) return;
                if (onCourseClick) {
                  onCourseClick(courseId);
                } else {
                  openCourse(courseId);
                }
              }}
              onMouseEnter={() => course && handleHover(true)}
              onMouseLeave={() => course && handleHover(false)}
            >
              <span className="min-w-0 whitespace-normal">{titleName}</span>
            </button>
            {course && titleTeachers.length > 0 && (
              <span className="font-bold">
                {" - "}
                <InstructorNames
                  names={titleTeachers}
                  identityNames={titleTeacherIdentities}
                  lang={language}
                />
              </span>
            )}
            {showChevron && (
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
          {englishNames === "add" && course && (
            <div className="text-sm">
              {course.name_en}
              {(course.teacher_en ?? []).length > 0 && (
                <>
                  {" - "}
                  <InstructorNames
                    names={course.teacher_en ?? []}
                    identityNames={bilingualNames.map(({ nameZh }) => nameZh)}
                    lang={language}
                  />
                </>
              )}
            </div>
          )}
          {course && (
            <>
              {showVenue && (
                <div className="flex min-w-0 flex-col gap-1">
                  {course.venues.map((vn, i) => (
                    <div key={i} className="text-muted-foreground text-xs">
                      {`${vn} / ${
                        missingTimeLabel &&
                        !hasTimes(course as unknown as MinimalCourse)
                          ? missingTimeLabel
                          : course.times![i]
                      }`}
                    </div>
                  ))}
                </div>
              )}
              <CourseTagList
                course={course}
                showCredits={showCredits}
                showEnrollment={showEnrollment}
                showAdditionalTags={showAdditionalTags}
                priority={
                  showPriority && showAdditionalTags ? priority : undefined
                }
              />
            </>
          )}
        </div>
        {showSyllabusDetails && course && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">{syllabus.brief}</p>
            {course.restrictions && course.restrictions.length > 0 && (
              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {dict.course.details.restriction_prefix}
                {course.restrictions}
              </p>
            )}
            {course.note && course.note.length > 0 && (
              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {dict.course.details.note_prefix}
                {course.note}
              </p>
            )}
            {course.prerequisites && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {dict.course.details.prerequisites_available}{" "}
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p
                    className="whitespace-pre-line text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeCourseHtml(course.prerequisites),
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>
      <div
        className={`flex min-w-0 shrink-0 flex-col items-end gap-2${
          alignSideItemsTop ? " self-start" : ""
        }`}
      >
        {actions ??
          (course && <SelectCourseButton courseId={course.raw_id as string} />)}
      </div>
    </div>
  );
});

CourseListItem.displayName = "CourseListItem";
export default CourseListItem;
