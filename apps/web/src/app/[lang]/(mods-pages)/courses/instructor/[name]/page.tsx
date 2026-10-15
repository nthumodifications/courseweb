import { useMemo, type ReactNode } from "react";
import { ExternalLink, Info } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, Button, Separator } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { CourseOfferingRow } from "@/components/Courses/CourseOfferingRow";
import { CourseDialogLink } from "@/components/Courses/CourseDialog";
import { ModuleLoading } from "@/components/Courses/ModuleLoading";
import { toPrettySemester } from "@/helpers/semester";
import {
  clusterEnglishNames,
  decodeInstructorRouteParam,
  getInstructorEnglishNames,
  getInstructorGradeHistory,
  getInstructorModuleTitle,
  groupInstructorOfferings,
  formatInstructorEnglishNames,
  isInstructorPageName,
  normaliseInstructorName,
} from "@/lib/instructors";
import { getInstructorOfferings, getModuleScores } from "@/lib/modules";
import type { ModuleScore } from "@/lib/module-insights";
import {
  CoursePageErrorPage,
  CoursePageContent,
  CoursePageState,
} from "@/components/Courses/CoursePageFrame";
import type { Language } from "@/types/settings";

const STALE_TIME = 24 * 60 * 60 * 1000;

type Dictionary = ReturnType<typeof useDictionary>;

const scoreLabel = (
  score: { average: number; type: string },
  dict: Dictionary,
) =>
  `${score.average.toFixed(score.type === "gpa" ? 2 : 1)} ${
    score.type === "gpa"
      ? dict.course.module.stats.gpa_scale
      : dict.course.module.stats.percent_scale
  }`;

const InstructorModule = ({
  group,
  lang,
  name,
  scores,
  dict,
}: {
  group: ReturnType<typeof groupInstructorOfferings>[number];
  lang: string;
  name: string;
  scores: ModuleScore[];
  dict: Dictionary;
}) => {
  const gradeHistory = getInstructorGradeHistory(group.offerings, scores, name);
  const moduleTitle = getInstructorModuleTitle(group, lang);

  return (
    <section className="flex flex-col gap-2">
      <CourseDialogLink
        to={`/${lang}/courses/module/${encodeURIComponent(group.key)}`}
        className="w-fit underline-offset-4 hover:underline"
      >
        <span className="font-bold text-xl text-nthu-600">
          {group.department} {group.course}
        </span>{" "}
        <span className="font-bold text-xl">{moduleTitle}</span>
      </CourseDialogLink>
      <div className="divide-y divide-border">
        {group.offerings.map((offering, index) => (
          <CourseOfferingRow
            key={offering.raw_id}
            offering={offering}
            lang={lang}
            dict={dict}
            showSemester={
              index === 0 ||
              offering.semester !== group.offerings[index - 1]?.semester
            }
          />
        ))}
      </div>
      {gradeHistory.offerings.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <h3 className="font-bold">{dict.course.instructor.grades}</h3>
          {gradeHistory.mode === "average" && gradeHistory.average ? (
            <p className="text-sm text-muted-foreground">
              {dict.course.instructor.average_grade}{" "}
              {scoreLabel(gradeHistory.average, dict)}
              {" · "}
              {gradeHistory.average.count} {dict.course.module.stats.classes}
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {gradeHistory.offerings.map((entry) => (
                <li key={entry.raw_id}>
                  {toPrettySemester(entry.semester)}:{" "}
                  {entry.scores
                    .map((score) => scoreLabel(score, dict))
                    .join(" / ")}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
};

export const InstructorPageContent = ({
  lang,
  name,
  inDialog = false,
}: {
  lang: Language;
  name: string;
  inDialog?: boolean;
}) => {
  const displayName = normaliseInstructorName(name);
  const showInstructorActions = isInstructorPageName(name);
  const dict = useDictionary();
  const {
    data: offerings,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["instructor", name],
    queryFn: () => getInstructorOfferings(name),
    enabled: Boolean(name),
    staleTime: STALE_TIME,
    gcTime: STALE_TIME * 7,
  });
  const rawIds = useMemo(
    () => offerings?.map((offering) => offering.raw_id) ?? [],
    [offerings],
  );
  const { data: scores = [] } = useQuery({
    queryKey: ["instructor-scores", rawIds],
    queryFn: () => getModuleScores(rawIds),
    enabled: rawIds.length > 0,
    staleTime: STALE_TIME,
    retry: false,
  });

  const instructorOfferings = offerings ?? [];
  const groups = groupInstructorOfferings(instructorOfferings);
  const englishNames = getInstructorEnglishNames(instructorOfferings, name);
  const namesakeClusters = clusterEnglishNames(englishNames);
  const departments = [...new Set(groups.map((group) => group.department))];
  const title = displayName
    ? `${displayName} | NTHUMods`
    : `${dict.course.instructor.title} | NTHUMods`;
  const instructorErrorTitle = error
    ? dict.common.load_error
    : dict.course.module.no_offerings;
  const contentClass = "flex min-w-0 flex-col gap-4 pb-6";
  const renderState = (children: ReactNode) => (
    <CoursePageState lang={lang} dict={dict} inDialog={inDialog} title={title}>
      {children}
    </CoursePageState>
  );

  if (isLoading) {
    return renderState(<ModuleLoading />);
  }

  if (error || instructorOfferings.length === 0) {
    return (
      <CoursePageErrorPage
        lang={lang}
        dict={dict}
        inDialog={inDialog}
        pageTitle={title}
        error={Boolean(error)}
        title={instructorErrorTitle}
        retryLabel={dict.common.try_again}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <CoursePageState
      lang={lang}
      dict={dict}
      inDialog={inDialog}
      title={title}
      description={`${displayName} ${dict.course.instructor.description}`}
    >
      <CoursePageContent inDialog={inDialog}>
        <div className={contentClass}>
          <header className="flex min-w-0 flex-col gap-2">
            <h1 className="min-w-0 whitespace-normal font-bold text-xl">
              {displayName}
            </h1>
            {englishNames.length > 0 && (
              <h2 className="min-w-0 whitespace-normal font-medium">
                {formatInstructorEnglishNames(englishNames)}
              </h2>
            )}
            <p className="text-sm text-muted-foreground">
              {dict.course.instructor.departments}: {departments.join(", ")}
            </p>
            {showInstructorActions && (
              <Button variant="ghost" asChild className="w-fit">
                <a
                  href={`https://scholars.nthu.edu.tw/esploro/search/researchers?query=${encodeURIComponent(name)}&page=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  {dict.course.instructor.research_portal}
                </a>
              </Button>
            )}
          </header>

          {showInstructorActions && namesakeClusters.length > 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {dict.course.instructor.namesake_notice}{" "}
                <span className="font-medium">
                  {formatInstructorEnglishNames(englishNames)}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex min-w-0 flex-col gap-6">
            <h2 className="font-bold">{dict.course.instructor.offerings}</h2>
            {groups.map((group) => (
              <InstructorModule
                key={group.key}
                group={group}
                lang={lang}
                name={name}
                scores={scores}
                dict={dict}
              />
            ))}
          </div>
        </div>
      </CoursePageContent>
    </CoursePageState>
  );
};

const InstructorPage = () => {
  const { lang: rawLang, name: rawName } = useParams<{
    lang: string;
    name: string;
  }>();
  return (
    <InstructorPageContent
      lang={rawLang === "en" ? "en" : rawLang === "zh-cn" ? "zh-cn" : "zh"}
      name={decodeInstructorRouteParam(rawName)}
    />
  );
};

export default InstructorPage;
