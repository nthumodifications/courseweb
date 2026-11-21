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
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import {
  COURSE_INSTRUCTOR_SEPARATOR,
  decodeCourseText,
} from "@/lib/course-text";

// Memoize the CourseListItem component
type CourseListItemCourse = CourseDefinition &
  Partial<Pick<CourseSyllabusView, "brief" | "keywords">>;

export const formatCourseCode = (
  course: Pick<CourseDefinition, "department" | "course" | "class">,
) => `${course.department} ${course.course}${course.class.padStart(2, "0")}`;

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
  syllabusFullWidth?: boolean;
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
    syllabusFullWidth = false,
    priority,
    missingTimeLabel,
    dimmed = false,
    onCourseClick,
  } = props;
  const dict = useDictionary();
  const { language } = useSettings();
  const localizeData = useLocalizedZhData();
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
      ? decodeCourseText(course.name_en)
      : localizeData(decodeCourseText(course.name_zh))
    : dict.course.details.favourite_unavailable;
  const titleTeachers = course
    ? useEnglishTitle
      ? (course.teacher_en ?? []).map(decodeCourseText)
      : course.teacher_zh.map((name) => localizeData(decodeCourseText(name)))
    : [];
  const titleTeacherIdentities = useEnglishTitle
    ? bilingualNames.map(({ nameZh }) => nameZh)
    : titleTeachers;

  const courseHeading = (
    <div
      className={`min-w-0 text-left ${compact ? "space-y-0" : "space-y-1 leading-relaxed"}`}
    >
      <div className="flex flex-row items-center gap-2">
        {hasTaken && (
          <div className="flex min-w-[65px] flex-row items-center justify-center rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground select-none">
            {dict.course.details.taken}
          </div>
        )}
        {showCourseCode && (
          <p className="text-nthu-500 text-sm font-bold">
            {course ? formatCourseCode(course) : missingCourseId}
          </p>
        )}
      </div>
      <div className="min-w-0 max-w-full text-left">
        <button
          className="inline max-w-full text-left font-bold hover:underline cursor-pointer"
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
          {titleName}
        </button>
        {course && titleTeachers.length > 0 && (
          <span className="font-bold">
            {COURSE_INSTRUCTOR_SEPARATOR}
            <InstructorNames
              names={titleTeachers}
              identityNames={titleTeacherIdentities}
              lang={language}
            />
          </span>
        )}
        {showChevron && (
          <ChevronRight
            className="inline-block h-4 w-4 align-[-0.15em]"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );

  const courseMetadata = course ? (
    <div className={`min-w-0 ${compact ? "space-y-0" : "space-y-1"}`}>
      {englishNames === "add" && (
        <div className="text-sm">
          {decodeCourseText(course.name_en)}
          {(course.teacher_en ?? []).length > 0 && (
            <>
              {COURSE_INSTRUCTOR_SEPARATOR}
              <InstructorNames
                names={(course.teacher_en ?? []).map(decodeCourseText)}
                identityNames={bilingualNames.map(({ nameZh }) => nameZh)}
                lang={language}
              />
            </>
          )}
        </div>
      )}
      {showVenue && (
        <div className="flex min-w-0 flex-col gap-1">
          {course.venues.map((vn, i) => (
            <div key={i} className="text-muted-foreground text-xs">
              {`${localizeData(decodeCourseText(vn))} / ${
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
        priority={showPriority && showAdditionalTags ? priority : undefined}
      />
    </div>
  ) : null;

  const syllabusDetails =
    showSyllabusDetails && course ? (
      <div className="flex min-w-0 flex-col gap-2">
        {syllabus.brief && (
          <p
            className={`text-xs text-muted-foreground${
              syllabusFullWidth ? " line-clamp-3" : ""
            }`}
          >
            {localizeData(decodeCourseText(syllabus.brief))}
          </p>
        )}
        {course.restrictions && course.restrictions.length > 0 && (
          <p className="text-xs whitespace-pre-line text-muted-foreground">
            {dict.course.details.restriction_prefix}
            {localizeData(decodeCourseText(course.restrictions))}
          </p>
        )}
        {course.note && course.note.length > 0 && (
          <p className="text-xs whitespace-pre-line text-muted-foreground">
            {dict.course.details.note_prefix}
            {localizeData(decodeCourseText(course.note))}
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
                  __html: sanitizeCourseHtml(
                    localizeData(course.prerequisites),
                  ),
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    ) : null;

  const actionColumn = (
    <div
      className={`flex shrink-0 flex-col items-end gap-2${
        alignSideItemsTop || syllabusFullWidth ? " self-start" : ""
      }`}
    >
      {actions ??
        (course && <SelectCourseButton courseId={course.raw_id as string} />)}
    </div>
  );

  return (
    <div
      className={`min-w-0 @container ${
        syllabusFullWidth
          ? "flex flex-col gap-2 py-4"
          : `flex flex-row ${compact ? "gap-2 py-0.5" : "gap-4 py-4"}`
      }${dimmed ? " opacity-60" : ""}`}
    >
      {alignSideItemsTop && leading ? (
        <div className="self-start">{leading}</div>
      ) : (
        leading
      )}
      {syllabusFullWidth ? (
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 gap-4">
            <div className="min-w-0 flex-1">{courseHeading}</div>
            {actionColumn}
          </div>
          {courseMetadata}
          {syllabusDetails}
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div
              className={`${compact ? "mb-0 space-y-0" : "mb-2 space-y-1"} @md:pt-0`}
            >
              {courseHeading}
              {courseMetadata}
            </div>
            {syllabusDetails}
          </div>
          {actionColumn}
        </>
      )}
    </div>
  );
});

CourseListItem.displayName = "CourseListItem";
export default CourseListItem;
