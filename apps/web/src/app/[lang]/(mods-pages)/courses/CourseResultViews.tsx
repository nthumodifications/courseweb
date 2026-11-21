import { useMemo } from "react";
import {
  Badge,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@courseweb/ui";
import { Clock, MapPin, User } from "lucide-react";
import type { CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { formatCourseCode } from "@/components/Courses/CourseListItem";
import SelectCourseButton from "@/components/Courses/SelectCourseButton";
import {
  hasKnownCourseCapacity,
  isChineseCourseLanguage,
  isEnglishCourseLanguage,
} from "@/components/Courses/CourseTagsList";
import { InstructorLink } from "@/components/Courses/InstructorLink";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import { pairInstructorNames } from "@/lib/instructors";
import { decodeCourseText } from "@/lib/course-text";

type CourseSearchHit = CourseSyllabusView & { objectID: string };

const useCourseDisplayText = (course: CourseSyllabusView) => {
  const { language } = useSettings();
  const localizeData = useLocalizedZhData();
  const english = language === "en";
  const title = english
    ? decodeCourseText(course.name_en)
    : localizeData(decodeCourseText(course.name_zh));
  const teacherNames = english
    ? (course.teacher_en ?? []).map(decodeCourseText)
    : course.teacher_zh.map((name) => localizeData(decodeCourseText(name)));
  const teacherIdentities = english
    ? pairInstructorNames(course.teacher_zh, course.teacher_en).map(
        ({ nameZh }) => nameZh,
      )
    : teacherNames;

  return { title, teacherNames, teacherIdentities, language };
};

const CourseResultIdentity = ({
  course,
  variant,
}: {
  course: CourseSyllabusView;
  variant: "table" | "grid";
}) => {
  const { openCourse } = useCourseLink();
  const { title, teacherNames, teacherIdentities, language } =
    useCourseDisplayText(course);
  const identity = useMemo(
    () =>
      teacherNames.map((displayName, index) => ({
        displayName,
        name: teacherIdentities[index] ?? "",
      })),
    [teacherIdentities, teacherNames],
  );

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        className={
          variant === "grid"
            ? "line-clamp-2 text-left font-bold leading-relaxed hover:underline"
            : "text-left font-medium leading-relaxed hover:underline"
        }
        onClick={() => openCourse(course.raw_id)}
      >
        {title}
      </button>
      {identity.length > 0 && (
        <div
          className={`flex min-w-0 items-start gap-1 text-xs text-muted-foreground${
            variant === "grid" ? " leading-relaxed" : ""
          }`}
        >
          {variant === "grid" && (
            <User className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">
            {identity.map(({ displayName, name }, index) => (
              <span key={`${name}-${index}`}>
                {index > 0 ? (language === "en" ? ", " : "、") : ""}
                <InstructorLink lang={language} name={name}>
                  {displayName}
                </InstructorLink>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

const CourseTimeLocations = ({
  course,
  icons = false,
}: {
  course: CourseSyllabusView;
  icons?: boolean;
}) => {
  const localizeData = useLocalizedZhData();
  const entries = useMemo(
    () =>
      Array.from(
        { length: Math.max(course.venues.length, course.times?.length ?? 0) },
        (_, index) => ({
          venue: course.venues[index],
          time: course.times?.[index],
        }),
      ).filter(({ venue, time }) => venue || time),
    [course.times, course.venues],
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {entries.map(({ venue, time }, index) => (
        <div
          key={`${venue ?? ""}-${time ?? ""}-${index}`}
          className="flex min-w-0 flex-col"
        >
          {time && (
            <span className="flex min-w-0 items-center gap-1 text-foreground">
              {icons && (
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              {time}
            </span>
          )}
          {venue && (
            <span className="flex min-w-0 items-center gap-1">
              {icons && (
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span className="min-w-0 truncate">
                {localizeData(decodeCourseText(venue))}
              </span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// "39/40" when the capacity is known; "1 選上" when only the enrolment is, so a
// bare number is never mistaken for the capacity.
const getEnrollmentSummary = (
  course: CourseSyllabusView,
  unknownValue: string,
  enrolledSuffix: string,
) => {
  if (!hasKnownCourseCapacity(course.capacity)) {
    return course.enrolled == null
      ? null
      : `${course.enrolled} ${enrolledSuffix}`;
  }
  return `${course.enrolled ?? unknownValue}/${course.capacity}`;
};

const CourseLanguageBadge = ({ course }: { course: CourseSyllabusView }) => {
  const dict = useDictionary();
  if (!course.language || isChineseCourseLanguage(course.language)) {
    return null;
  }
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-primary/10 font-normal text-primary"
    >
      {isEnglishCourseLanguage(course.language)
        ? dict.course.tags.english
        : course.language}
    </Badge>
  );
};

const CourseSummaryBadges = ({ course }: { course: CourseSyllabusView }) => {
  const dict = useDictionary();
  const enrollment = getEnrollmentSummary(
    course,
    dict.common.not_available,
    dict.course.tags.enrolled_suffix,
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="secondary" className="font-normal">
        {course.credits} {dict.course.credits}
      </Badge>
      {enrollment && (
        <Badge variant="secondary" className="font-normal">
          {enrollment}
        </Badge>
      )}
      <CourseLanguageBadge course={course} />
    </div>
  );
};

export const CourseGridCard = ({ course }: { course: CourseSyllabusView }) => {
  const { setHoverCourse } = useUserTimetable();

  return (
    <article
      className="flex h-full min-w-0 flex-col gap-2 rounded-lg border border-transparent bg-surface p-3"
      onMouseEnter={() => setHoverCourse(course)}
      onMouseLeave={() => setHoverCourse(null)}
    >
      {/* The code sits above the title beside the buttons, so it doesn't
          get a row of its own as tall as the buttons. */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">
            {formatCourseCode(course)}
          </span>
          <CourseResultIdentity course={course} variant="grid" />
        </div>
        <SelectCourseButton courseId={course.raw_id} iconOnly />
      </div>
      <CourseTimeLocations course={course} icons />
      <div className="mt-auto pt-2">
        <CourseSummaryBadges course={course} />
      </div>
    </article>
  );
};

export const CourseResultsTable = ({
  courses,
  loadingRows = 0,
}: {
  courses: CourseSearchHit[];
  loadingRows?: number;
}) => {
  const dict = useDictionary();
  const { setHoverCourse } = useUserTimetable();
  const columns = dict.course.search.views.columns;

  return (
    <Table
      containerClassName="relative w-full overflow-x-auto overflow-y-visible md:overflow-visible"
      className="min-w-[540px] table-fixed"
    >
      {/* Fixed widths keep the actions column on screen next to the filter
          and timetable panels; the title column takes what is left. */}
      <colgroup>
        <col className="w-24" />
        <col />
        <col className="w-32" />
        <col className="w-12" />
        <col className="w-20" />
        <col className="w-24" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-background">
          {[
            columns.code,
            columns.title,
            columns.time_location,
            columns.credits,
            columns.enrollment,
            columns.actions,
          ].map((label) => (
            <TableHead
              key={label}
              className="sticky top-0 z-10 h-10 bg-background px-2 py-2 text-sm"
            >
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow
            key={course.objectID}
            className="min-h-11"
            onMouseEnter={() => setHoverCourse(course)}
            onMouseLeave={() => setHoverCourse(null)}
          >
            <TableCell className="whitespace-nowrap px-2 py-3 align-top text-xs text-muted-foreground">
              {formatCourseCode(course)}
            </TableCell>
            <TableCell className="min-w-0 px-2 py-3 align-top">
              <div className="flex min-w-0 flex-col items-start gap-1">
                <CourseResultIdentity course={course} variant="table" />
                <CourseLanguageBadge course={course} />
              </div>
            </TableCell>
            <TableCell className="px-2 py-3 align-top">
              <CourseTimeLocations course={course} />
            </TableCell>
            <TableCell className="whitespace-nowrap px-2 py-3 align-top">
              {course.credits}
            </TableCell>
            <TableCell className="whitespace-nowrap px-2 py-3 align-top">
              {getEnrollmentSummary(
                course,
                dict.common.not_available,
                dict.course.tags.enrolled_suffix,
              ) ?? dict.common.not_available}
            </TableCell>
            <TableCell className="whitespace-nowrap px-2 py-3 align-top">
              <SelectCourseButton courseId={course.raw_id} iconOnly />
            </TableCell>
          </TableRow>
        ))}
        {Array.from({ length: loadingRows }, (_, index) => (
          <TableRow key={`loading-${index}`} className="min-h-11">
            <TableCell className="px-2 py-3">
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell className="px-2 py-3">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            </TableCell>
            <TableCell className="px-2 py-3">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="px-2 py-3">
              <Skeleton className="h-4 w-8" />
            </TableCell>
            <TableCell className="px-2 py-3">
              <Skeleton className="h-4 w-12" />
            </TableCell>
            <TableCell className="px-2 py-3">
              <Skeleton className="h-8 w-10" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
