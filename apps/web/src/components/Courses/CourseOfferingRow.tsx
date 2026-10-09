import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import type { ModuleOffering } from "@/lib/modules";

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
  const names = lang === "en" ? offering.teacher_en : offering.teacher_zh;
  return (
    (names?.length ? names : offering.teacher_zh)?.join(
      lang === "en" ? ", " : "、",
    ) || unavailable
  );
};

const formatTimesAndVenues = (
  offering: ModuleOffering,
  unavailable: string,
) => {
  const values = offering.times.map((time, index) =>
    `${time} ${offering.venues[index] ?? ""}`.trim(),
  );
  return values.length > 0 ? values.join(" · ") : unavailable;
};

export const CourseOfferingRow = ({
  offering,
  lang,
  dict,
  showSemester,
}: {
  offering: ModuleOffering;
  lang: string;
  dict: Dictionary;
  showSemester: boolean;
}) => {
  const language = offering.language.trim();
  const capacity =
    offering.capacity === null
      ? null
      : `${dict.course.module.capacity} ${offering.capacity} / ${offering.enrolled}`;

  return (
    <Link
      to={offeringLink(lang, offering.raw_id)}
      className="group flex min-w-0 items-start gap-4 py-3 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
      aria-label={`${dict.course.module.view_offering} ${toPrettySemester(offering.semester)} ${sectionLabel(dict, offering.class)}`}
    >
      <span className="w-14 shrink-0 text-sm font-bold text-nthu-600">
        {showSemester ? toPrettySemester(offering.semester) : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {formatInstructors(offering, lang, dict.course.module.not_available)}
          <span className="ml-2 font-normal text-muted-foreground">
            {sectionLabel(dict, offering.class)}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {formatTimesAndVenues(offering, dict.course.module.not_available)}
        </span>
        {(language || capacity) && (
          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {language && <span>{language}</span>}
            {capacity && <span>{capacity}</span>}
          </span>
        )}
      </span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
};
