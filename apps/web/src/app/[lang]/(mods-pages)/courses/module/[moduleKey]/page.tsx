import { Fragment, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import ModulePrerequisiteList from "@/components/Courses/ModulePrerequisiteList";
import { usePrerequisiteGraphData } from "@/components/CourseDetails/usePrerequisiteGraphData";
import { ModuleTermDots } from "@/components/Courses/ModuleTermAvailability";
import { CourseOfferingRow } from "@/components/Courses/CourseOfferingRow";
import {
  CoursePageErrorPage,
  CoursePageContent,
  CoursePageState,
} from "@/components/Courses/CoursePageFrame";
import { ModuleLoading } from "@/components/Courses/ModuleLoading";
import {
  ModuleBrief,
  ModuleDemand,
  ModuleInstructors,
  ModuleStats,
} from "@/components/Courses/ModuleInsights";
import { toPrettySemester } from "@/helpers/semester";
import { contentLanguage } from "@/helpers/contentLanguage";
import type { Language } from "@/types/settings";
import { getLanguages } from "@/lib/module-insights";
import {
  getModuleOfferings,
  getModuleVariant,
  getModuleInstructorSummaries,
  createModuleKey,
  parseModuleKey,
  type ModuleAggregate,
  type ModuleHistory,
  type ModuleVariant,
} from "@/lib/modules";
import { normaliseInstructorName } from "@/lib/instructors";
import ReviewsSection from "@/components/Reviews/ReviewsSection";

const MODULE_STALE_TIME = 24 * 60 * 60 * 1000;

type Dictionary = ReturnType<typeof useDictionary>;

const decodeModuleKey = (value: string | undefined) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const academicYearRange = (semesters: readonly string[]) => {
  const years = semesters.map((semester) => Number(semester.slice(0, 3)));
  return `${Math.min(...years)}–${Math.max(...years)}`;
};

const VariantPicker = ({
  module,
  selectedVariant,
  lang,
  dict,
  onChange,
}: {
  module: ModuleAggregate;
  selectedVariant: ModuleVariant;
  lang: string;
  dict: Dictionary;
  onChange: (title: string) => void;
}) => {
  if (module.variants.length <= 1) return null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {dict.course.module.variant_count_prefix} {module.variants.length}{" "}
        {dict.course.module.variant_count_suffix}
      </span>
      <Select value={selectedVariant.titleKey} onValueChange={onChange}>
        <SelectTrigger
          id="module-title"
          className="h-auto min-h-11 min-w-0 flex-1 [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left"
          aria-label={dict.course.module.variant_picker}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {module.variants.map((variant) => (
            <SelectItem
              key={variant.titleKey}
              value={variant.titleKey}
              className="h-auto whitespace-normal"
            >
              {contentLanguage(lang) === "en" ? variant.nameEn : variant.nameZh}{" "}
              · {variant.semesters.length} {dict.course.module.semesters_count}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const OfferingList = ({
  variant,
  lang,
  dict,
  selectedInstructor,
}: {
  variant: ModuleVariant;
  lang: string;
  dict: Dictionary;
  selectedInstructor: string | null;
}) => {
  const [showAll, setShowAll] = useState(false);
  const groups = variant.history
    .slice()
    .reverse()
    .map((history) => ({
      ...history,
      offerings: history.offerings.filter(
        (offering) =>
          !selectedInstructor ||
          offering.teacher_zh?.includes(selectedInstructor) ||
          offering.teacher_en?.includes(selectedInstructor),
      ),
    }))
    .filter((history) => history.offerings.length > 0);
  const latestGroups = groups.slice(0, 4);
  const olderGroups = groups.slice(4);

  const renderGroup = (history: ModuleHistory) => (
    <div
      key={history.semester}
      className="border-b border-border last:border-b-0"
    >
      {history.offerings.map((offering, index) => (
        <CourseOfferingRow
          key={offering.raw_id}
          offering={offering}
          lang={lang}
          dict={dict}
          showSemester={index === 0}
          compact
        />
      ))}
    </div>
  );

  return (
    <section aria-labelledby="module-offerings" className="flex flex-col gap-2">
      <h2 id="module-offerings" className="font-bold">
        {dict.course.module.offering_details}
      </h2>
      <div>
        {latestGroups.map(renderGroup)}
        {olderGroups.length > 0 && (
          <>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between border-y border-border py-2 text-left text-sm font-medium hover:text-primary"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
            >
              <span>
                {showAll
                  ? dict.course.module.show_fewer
                  : `${dict.course.module.show_all} ${variant.semesters.length} ${dict.course.module.semesters_count}`}
              </span>
              <ArrowRight
                className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showAll ? "rotate-90" : ""}`}
                aria-hidden="true"
              />
            </button>
            {showAll && olderGroups.map(renderGroup)}
          </>
        )}
      </div>
    </section>
  );
};

const ModuleEmptyState = ({
  lang,
  dict,
  inDialog,
  pageTitle,
  errorTitle,
}: {
  lang: Language;
  dict: Dictionary;
  inDialog: boolean;
  pageTitle: string;
  errorTitle: string;
}) => (
  <CoursePageState
    lang={lang}
    dict={dict}
    inDialog={inDialog}
    wide
    title={pageTitle}
  >
    <ErrorState title={errorTitle} />
  </CoursePageState>
);

export const ModulePageContent = ({
  lang,
  moduleKey: rawModuleKey,
  inDialog = false,
  dialogSearch,
  onDialogSearchChange,
}: {
  lang: Language;
  moduleKey: string;
  inDialog?: boolean;
  dialogSearch?: string;
  onDialogSearchChange?: (search: URLSearchParams) => void;
}) => {
  const moduleKey = decodeModuleKey(rawModuleKey);
  const parsedModuleKey = parseModuleKey(moduleKey);
  const canonicalModuleKey = parsedModuleKey
    ? createModuleKey(parsedModuleKey.department, parsedModuleKey.course)
    : moduleKey;
  const dict = useDictionary();
  const [pageSearchParams, setPageSearchParams] = useSearchParams();
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(
    null,
  );
  const searchParams = useMemo(
    () =>
      dialogSearch === undefined
        ? pageSearchParams
        : new URLSearchParams(dialogSearch),
    [dialogSearch, pageSearchParams],
  );
  const requestedTitle = searchParams.get("title");
  const {
    data: module,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["module", canonicalModuleKey],
    queryFn: () => getModuleOfferings(canonicalModuleKey),
    enabled: Boolean(parsedModuleKey),
    staleTime: MODULE_STALE_TIME,
    gcTime: MODULE_STALE_TIME * 7,
  });
  const selectedVariant = module
    ? getModuleVariant(module, requestedTitle)
    : undefined;
  const prerequisiteOfferings = selectedVariant?.offerings.filter((offering) =>
    offering.prerequisites?.trim(),
  );
  const prerequisiteOffering = prerequisiteOfferings?.at(-1);
  const prerequisiteTexts = prerequisiteOfferings?.map((offering) =>
    offering.prerequisites?.trim(),
  );
  const prerequisitesDiffer =
    prerequisiteTexts && new Set(prerequisiteTexts).size > 1;
  const { parsedPrerequisite, prerequisiteGraph } =
    usePrerequisiteGraphData(prerequisiteOffering);

  const genericTitle = `${dict.course.module.title} | NTHUMods`;
  const moduleErrorTitle = error
    ? dict.common.load_error
    : dict.course.module.no_offerings;
  const contentClass = "flex min-w-0 flex-col gap-4";
  const renderState = (children: React.ReactNode) => (
    <CoursePageState
      lang={lang}
      dict={dict}
      inDialog={inDialog}
      wide
      title={genericTitle}
    >
      {children}
    </CoursePageState>
  );

  if (!moduleKey || !parsedModuleKey) {
    return (
      <ModuleEmptyState
        lang={lang}
        dict={dict}
        inDialog={inDialog}
        pageTitle={genericTitle}
        errorTitle={dict.course.module.invalid_key}
      />
    );
  }

  if (isLoading) {
    return renderState(<ModuleLoading />);
  }

  if (error || !module) {
    return (
      <CoursePageErrorPage
        lang={lang}
        dict={dict}
        inDialog={inDialog}
        wide
        pageTitle={genericTitle}
        error={Boolean(error)}
        title={moduleErrorTitle}
        retryLabel={dict.common.try_again}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!selectedVariant) {
    return (
      <ModuleEmptyState
        lang={lang}
        dict={dict}
        inDialog={inDialog}
        pageTitle={genericTitle}
        errorTitle={dict.course.module.no_offerings}
      />
    );
  }

  const contentLang = contentLanguage(lang);
  const pageName =
    contentLang === "en"
      ? selectedVariant.nameEn || selectedVariant.nameZh
      : selectedVariant.nameZh;
  const languages = getLanguages(selectedVariant.offerings)
    .slice(0, 2)
    .map(({ value }) =>
      value === "英"
        ? dict.course.tags.english
        : value === "中"
          ? dict.course.tags.chinese
          : value,
    )
    .join(contentLang === "en" ? ", " : "、");
  const metaSeparator = contentLang === "en" ? "·" : "・";
  const yearsAndCount =
    contentLang === "en"
      ? `${academicYearRange(selectedVariant.semesters)} · ${selectedVariant.semesters.length} ${dict.course.module.semesters_count}`
      : `${academicYearRange(selectedVariant.semesters)}・${selectedVariant.semesters.length}${dict.course.module.semesters_count}`;
  const reviewInstructors = [
    ...new Set(
      getModuleInstructorSummaries(selectedVariant)
        .map((entry) => normaliseInstructorName(entry.nameZh))
        .filter(Boolean),
    ),
  ];
  const reviewSemesterOptionsByInstructor = Object.fromEntries(
    reviewInstructors.map((instructor) => [
      instructor,
      [
        ...new Set(
          selectedVariant.offerings
            .filter((offering) =>
              (offering.teacher_zh ?? []).some(
                (teacher) => normaliseInstructorName(teacher) === instructor,
              ),
            )
            .map((offering) => offering.semester),
        ),
      ],
    ]),
  );

  return (
    <CoursePageState
      lang={lang}
      dict={dict}
      inDialog={inDialog}
      title={`${pageName} ${module.department} ${module.course} | NTHUMods`}
      wide
    >
      <CoursePageContent inDialog={inDialog}>
        <div className={contentClass}>
          <header className="flex min-w-0 flex-col gap-2 border-b border-border pb-3">
            <h1 className="flex min-w-0 flex-wrap items-baseline gap-2 font-bold">
              <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {module.department} {module.course}
              </span>
              <span className="min-w-0">{selectedVariant.nameZh}</span>
            </h1>
            {selectedVariant.nameEn && (
              <p className="text-sm text-muted-foreground">
                {selectedVariant.nameEn}
              </p>
            )}
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <span>
                {selectedVariant.credits.join(
                  contentLang === "en" ? "/" : "、",
                )}{" "}
                {dict.course.module.credits_unit}
              </span>
              <span aria-hidden="true">{metaSeparator}</span>
              {languages && (
                <>
                  <span>
                    {dict.course.module.stats.language} {languages}
                  </span>
                  <span aria-hidden="true">{metaSeparator}</span>
                </>
              )}
              <ModuleTermDots
                semesters={selectedVariant.semesters}
                showLabels
              />
              <span aria-hidden="true">{metaSeparator}</span>
              <span className="tabular-nums">{yearsAndCount}</span>
            </div>
          </header>

          <VariantPicker
            module={module}
            selectedVariant={selectedVariant}
            lang={lang}
            dict={dict}
            onChange={(title) => {
              const next = new URLSearchParams(searchParams);
              next.set("title", title);
              setSelectedInstructor(null);
              if (inDialog && onDialogSearchChange) {
                onDialogSearchChange(next);
              } else {
                setPageSearchParams(next, { replace: true });
              }
            }}
          />

          <ModuleStats variant={selectedVariant} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              {prerequisiteOffering &&
                parsedPrerequisite &&
                prerequisiteGraph &&
                (prerequisiteGraph.requirements.length > 0 ||
                  prerequisiteGraph.unlocks.length > 0) && (
                  <section
                    aria-labelledby="module-prerequisites"
                    className="flex flex-col gap-2"
                  >
                    <h2 id="module-prerequisites" className="font-bold">
                      {dict.course.details.prerequesites}
                    </h2>
                    <ModulePrerequisiteList
                      parsed={parsedPrerequisite}
                      graph={prerequisiteGraph}
                      lang={contentLanguage(lang)}
                      dict={dict}
                    />
                    {prerequisitesDiffer && (
                      <p className="text-sm text-muted-foreground">
                        {dict.course.details.prerequisite_based_on_offering.replace(
                          "{semester}",
                          toPrettySemester(prerequisiteOffering.semester),
                        )}
                      </p>
                    )}
                  </section>
                )}
              <OfferingList
                variant={selectedVariant}
                lang={lang}
                dict={dict}
                selectedInstructor={selectedInstructor}
              />
              <ModuleBrief variant={selectedVariant} />
              <ReviewsSection
                lang={lang}
                moduleKey={canonicalModuleKey}
                instructors={reviewInstructors}
                semesterOptions={selectedVariant.semesters}
                semesterOptionsByInstructor={reviewSemesterOptionsByInstructor}
                allowInstructorFilter
              />
            </div>
            <aside className="flex min-w-0 flex-col gap-4 lg:border-l lg:border-border lg:pl-4">
              <ModuleInstructors
                variant={selectedVariant}
                lang={lang}
                selected={selectedInstructor}
                onSelect={setSelectedInstructor}
              />
              <ModuleDemand variant={selectedVariant} />
            </aside>
          </div>
        </div>
        <div className="h-6" aria-hidden="true" />
      </CoursePageContent>
    </CoursePageState>
  );
};

const ModulePage = () => {
  const { lang: rawLang, moduleKey: rawModuleKey } = useParams<{
    lang: string;
    moduleKey: string;
  }>();
  return (
    <ModulePageContent
      lang={rawLang === "en" ? "en" : rawLang === "zh-cn" ? "zh-cn" : "zh"}
      moduleKey={rawModuleKey ?? ""}
    />
  );
};

export default ModulePage;
