import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ErrorState,
  Fade,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import PrerequisiteBlock from "@/components/CourseDetails/PrerequisiteBlock";
import { usePrerequisiteGraphData } from "@/components/CourseDetails/usePrerequisiteGraphData";
import { ModuleTermAvailability } from "@/components/Courses/ModuleTermAvailability";
import { CourseOfferingRow } from "@/components/Courses/CourseOfferingRow";
import { ModuleLoading } from "@/components/Courses/ModuleLoading";
import {
  ModuleBrief,
  ModuleDemand,
  ModuleInstructors,
  ModuleStats,
} from "@/components/Courses/ModuleInsights";
import { toPrettySemester } from "@/helpers/semester";
import {
  getModuleOfferings,
  getModuleVariant,
  parseModuleKey,
  type ModuleAggregate,
  type ModuleHistory,
  type ModuleVariant,
} from "@/lib/modules";

const MODULE_STALE_TIME = 24 * 60 * 60 * 1000;

type Dictionary = ReturnType<typeof useDictionary>;

// Same chip as HighlightItem in components/Courses/CourseTagsList.
const ModuleChip = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-[52px] flex-row items-center justify-center space-x-2 rounded-md bg-muted px-1 py-1 text-xs text-foreground select-none">
    {children}
  </div>
);

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
              {lang === "en" ? variant.nameEn : variant.nameZh} ·{" "}
              {variant.semesters.length} {dict.course.module.semesters_count}
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

const BackToCourses = ({ lang, dict }: { lang: string; dict: Dictionary }) => (
  <div className="flex flex-wrap gap-2">
    <Button variant="ghost" asChild size="sm" className="min-h-11 w-fit">
      <Link to={`/${lang}/courses`}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        {dict.common.back}
      </Link>
    </Button>
    <Button variant="ghost" asChild size="sm" className="min-h-11 w-fit">
      <Link to={`/${lang}/courses/modules`}>
        {dict.course.module.search_other_modules}
      </Link>
    </Button>
  </div>
);

const ModulePage = () => {
  const { lang: rawLang, moduleKey: rawModuleKey } = useParams<{
    lang: string;
    moduleKey: string;
  }>();
  const lang = rawLang === "en" ? "en" : "zh";
  const moduleKey = decodeModuleKey(rawModuleKey);
  const parsedModuleKey = parseModuleKey(moduleKey);
  const dict = useDictionary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(
    null,
  );
  const requestedTitle = searchParams.get("title");
  const {
    data: module,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["module", moduleKey],
    queryFn: () => getModuleOfferings(moduleKey),
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
  const prerequisiteTexts = prerequisiteOfferings?.map(
    (offering) => offering.prerequisites?.trim(),
  );
  const prerequisitesDiffer =
    prerequisiteTexts && new Set(prerequisiteTexts).size > 1;
  const {
    parsedPrerequisite,
    prerequisiteRows,
    prerequisiteGraph,
  } = usePrerequisiteGraphData(prerequisiteOffering);

  const genericTitle = `${dict.course.module.title} | NTHUMods`;
  const pageShellClass = "flex min-w-0 flex-col gap-4 px-4 md:px-6";
  const back = <BackToCourses lang={lang} dict={dict} />;

  if (!moduleKey || !parsedModuleKey) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className={`${pageShellClass} w-full max-w-7xl`}>
          {back}
          <ErrorState title={dict.course.module.invalid_key} />
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className={`${pageShellClass} w-full max-w-7xl`}>
          {back}
          <ModuleLoading />
        </div>
      </>
    );
  }

  if (error || !module) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className={`${pageShellClass} w-full max-w-7xl`}>
          {back}
          <ErrorState
            title={
              error ? dict.common.load_error : dict.course.module.no_offerings
            }
            action={
              error ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  {dict.common.try_again}
                </Button>
              ) : undefined
            }
          />
        </div>
      </>
    );
  }

  if (!selectedVariant) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className={`${pageShellClass} w-full max-w-7xl`}>
          {back}
          <ErrorState title={dict.course.module.no_offerings} />
        </div>
      </>
    );
  }

  const latestOffering = selectedVariant.offerings.at(-1)!;
  const pageName =
    lang === "en" ? latestOffering.name_en : latestOffering.name_zh;

  return (
    <>
      <Helmet>
        <title>{`${pageName} ${module.department} ${module.course} | NTHUMods`}</title>
        <meta
          name="description"
          content={`${pageName} (${latestOffering.name_zh}) ${dict.course.module.history}`}
        />
      </Helmet>
      <div className={`${pageShellClass} w-full max-w-7xl`}>
        {back}
        <Fade>
          <div className="flex min-w-0 flex-col gap-4 pb-6">
            {/* Mirrors the course detail header line for line. */}
            <header className="flex min-w-0 flex-col gap-2">
              <div className="font-medium text-base">
                {academicYearRange(selectedVariant.semesters)}{" "}
                {dict.course.module.academic_years}
              </div>
              <div className="font-bold text-xl text-nthu-600">
                {module.department} {module.course}
              </div>
              <h1 className="min-w-0 whitespace-normal font-bold text-xl">
                {latestOffering.name_zh}
              </h1>
              <h2 className="min-w-0 whitespace-normal font-medium">
                {latestOffering.name_en}
              </h2>
              <div className="flex flex-row flex-wrap gap-1 text-sm">
                <ModuleChip>
                  {selectedVariant.credits.join(" / ")}{" "}
                  {dict.course.module.credits_unit}
                </ModuleChip>
                <ModuleChip>
                  {selectedVariant.semesters.length}{" "}
                  {dict.course.module.semesters_count}
                </ModuleChip>
              </div>
              <ModuleTermAvailability semesters={selectedVariant.semesters} />
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
                setSearchParams(next, { replace: true });
              }}
            />

            <Separator />

            <div className="grid min-w-0 gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              {/* Phones see the summary first; on desktop it is the side column. */}
              <aside className="flex min-w-0 flex-col gap-6 lg:order-last lg:sticky lg:top-4 lg:self-start">
                <ModuleStats variant={selectedVariant} />
                <ModuleInstructors
                  variant={selectedVariant}
                  lang={lang}
                  selected={selectedInstructor}
                  onSelect={setSelectedInstructor}
                />
              </aside>
              <div className="flex min-w-0 flex-col gap-6">
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
                      <PrerequisiteBlock
                        parsed={parsedPrerequisite}
                        course={prerequisiteOffering}
                        rows={prerequisiteRows}
                        lang={lang}
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
                <ModuleBrief variant={selectedVariant} />
                <ModuleDemand variant={selectedVariant} />
                <OfferingList
                  variant={selectedVariant}
                  lang={lang}
                  dict={dict}
                  selectedInstructor={selectedInstructor}
                />
              </div>
            </div>
          </div>
        </Fade>
      </div>
    </>
  );
};

export default ModulePage;
