import { CourseDefinition, CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { FC, memo, ReactNode } from "react";
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
  priority?: number;
  missingTimeLabel?: string;
  dimmed?: boolean;
  onCourseClick?: (courseId: string) => void;
};

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

  const courseTitle = course
    ? englishNames === "replace"
      ? `${course.name_en} - ${course.teacher_en?.join(",")}`
      : englishNames
        ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
        : language === "zh"
          ? `${course.name_zh} - ${course.teacher_zh.join(",")}`
          : `${course.name_en} - ${course.teacher_en?.join(",")}`
    : dict.course.details.favourite_unavailable;
  const englishCourseTitle = course
    ? `${course.name_en} - ${course.teacher_en?.join(",")}`
    : undefined;

  return (
    <div
      className={`flex min-w-0 flex-row gap-4 py-4 @container${
        dimmed ? " opacity-60" : ""
      }`}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="mb-2 space-y-1 @md:pt-0">
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
            <span className="min-w-0 whitespace-normal">{courseTitle}</span>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          </button>
          {englishNames === "add" && englishCourseTitle && (
            <div className="text-sm">{englishCourseTitle}</div>
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
                priority={showPriority ? priority : undefined}
              />
            </>
          )}
        </div>
        {course && (
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
      <div className="flex min-w-0 shrink-0 flex-col items-end gap-2">
        {actions ??
          (course && <SelectCourseButton courseId={course.raw_id as string} />)}
      </div>
    </div>
  );
});

CourseListItem.displayName = "CourseListItem";
export default CourseListItem;
