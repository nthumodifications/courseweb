import { courseLanguageLabel } from "@/lib/course-language";
import { ChevronRight } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import type { ModuleOffering } from "@/lib/modules";
import { CourseDialogLink } from "@/components/Courses/CourseDialog";
import { contentLanguage } from "@/helpers/contentLanguage";
import { formatCourseTime } from "@/lib/format-course-times";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";

type Dictionary = ReturnType<typeof useDictionary>;

const sectionLabel = (dict: Dictionary, classCode: string) =>
  classCode === "0" ? dict.course.module.default_section : `#${classCode}`;

const offeringLink = (lang: string, rawId: string) =>
  `/${lang}/courses/${encodeURIComponent(rawId)}`;

const formatInstructors = (
  offering: ModuleOffering,
  lang: string,
  unavailable: string,
) => {
  const contentLang = contentLanguage(lang);
  const names =
    contentLang === "en" ? offering.teacher_en : offering.teacher_zh;
  return (
    (names?.length ? names : offering.teacher_zh)?.join(
      contentLang === "en" ? ", " : "、",
    ) || unavailable
  );
};

const formatTimesAndVenues = (
  offering: ModuleOffering,
  unavailable: string,
  lang: string,
) => {
  const language = contentLanguage(lang);
  const values = offering.times.map((time, index) =>
    `${formatCourseTime(time, language)} ${offering.venues[index] ?? ""}`.trim(),
  );
  return values.length > 0 ? values.join(" · ") : unavailable;
};

export const CourseOfferingRow = ({
  offering,
  lang,
  dict,
  showSemester,
  compact = false,
}: {
  offering: ModuleOffering;
  lang: string;
  dict: Dictionary;
  showSemester: boolean;
  compact?: boolean;
}) => {
  const localizeData = useLocalizedZhData();
  const languageLabel = courseLanguageLabel(
    offering.language,
    dict.course.tags,
  );
  const capacity =
    offering.capacity === null
      ? null
      : `${dict.course.module.capacity} ${offering.capacity} / ${offering.enrolled}`;

  if (compact) {
    const instructors = localizeData(
      formatInstructors(offering, lang, dict.course.module.not_available),
    );
    const timeAndVenue = localizeData(
      formatTimesAndVenues(offering, dict.course.module.not_available, lang),
    );
    const hasFill =
      offering.capacity !== null &&
      offering.capacity > 0 &&
      offering.enrolled !== null &&
      offering.enrolled !== 0;
    const fillPercent = hasFill
      ? Math.min((offering.enrolled! / offering.capacity!) * 100, 100)
      : 0;
    const fillLabel = hasFill
      ? `${offering.enrolled} / ${offering.capacity}`
      : dict.course.module.not_available;
    const section = sectionLabel(dict, offering.class);
    const languageAndVenue = [timeAndVenue, languageLabel]
      .filter(Boolean)
      .join(" · ");

    return (
      <CourseDialogLink
        to={offeringLink(lang, offering.raw_id)}
        className="group flex min-w-0 items-center gap-2 py-2 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 sm:gap-3"
        aria-label={`${dict.course.module.view_offering} ${toPrettySemester(offering.semester)} ${section}`}
        title={`${toPrettySemester(offering.semester)} · ${instructors} · ${section} · ${languageAndVenue} · ${dict.course.module.enrollment_fill} ${fillLabel}`}
      >
        <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
          {showSemester ? toPrettySemester(offering.semester) : ""}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {instructors}
            <span className="ml-1 font-normal text-muted-foreground">
              · {section}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {languageAndVenue}
          </span>
        </span>
        <span className="flex w-[4.5rem] shrink-0 flex-col gap-1">
          <span
            className="text-right text-xs tabular-nums text-muted-foreground"
            aria-label={`${dict.course.module.enrollment_fill}: ${fillLabel}`}
          >
            {fillLabel}
          </span>
          <span
            role="img"
            aria-label={`${dict.course.module.enrollment_fill}: ${fillLabel}`}
            className="h-1 overflow-hidden rounded-full bg-muted"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${fillPercent}%` }}
            />
          </span>
        </span>
      </CourseDialogLink>
    );
  }

  return (
    <CourseDialogLink
      to={offeringLink(lang, offering.raw_id)}
      className="group flex min-w-0 items-start gap-4 py-3 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
      aria-label={`${dict.course.module.view_offering} ${toPrettySemester(offering.semester)} ${sectionLabel(dict, offering.class)}`}
    >
      <span className="w-14 shrink-0 text-sm font-bold text-nthu-600">
        {showSemester ? toPrettySemester(offering.semester) : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {localizeData(
            formatInstructors(offering, lang, dict.course.module.not_available),
          )}
          <span className="ml-2 font-normal text-muted-foreground">
            {sectionLabel(dict, offering.class)}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {localizeData(
            formatTimesAndVenues(
              offering,
              dict.course.module.not_available,
              lang,
            ),
          )}
        </span>
        {(languageLabel || capacity) && (
          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {languageLabel && <span>{languageLabel}</span>}
            {capacity && <span>{capacity}</span>}
          </span>
        )}
      </span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    </CourseDialogLink>
  );
};
