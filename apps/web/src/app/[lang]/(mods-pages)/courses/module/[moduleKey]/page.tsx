import { ArrowRight, ChevronLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Fade,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import {
  getAvailableTerms,
  getModuleOfferings,
  getModuleVariant,
  getOfferingPattern,
  inferNextOffering,
  parseModuleKey,
  type ModuleAggregate,
  type ModuleHistory,
  type ModuleOffering,
  type ModuleVariant,
  type OfferingPattern,
  type SemesterTerm,
} from "@/lib/modules";

const MODULE_STALE_TIME = 24 * 60 * 60 * 1000;

const decodeModuleKey = (value: string | undefined) => {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const ModuleLoading = () => (
  <div className="flex animate-pulse flex-col gap-4">
    <div className="h-6 w-48 rounded bg-muted" />
    <div className="h-10 w-3/4 rounded bg-muted" />
    <div className="h-48 rounded bg-muted" />
  </div>
);

const termLabel = (
  dict: ReturnType<typeof useDictionary>,
  term: SemesterTerm,
) => dict.course.module.terms[term];

const patternLabel = (
  dict: ReturnType<typeof useDictionary>,
  pattern: OfferingPattern,
) => dict.course.module.patterns[pattern];

const offeringLink = (lang: string, rawId: string) =>
  `/${lang}/courses/${encodeURIComponent(rawId)}`;

const formatInstructors = (
  offering: ModuleOffering,
  lang: string,
  unavailable: string,
) => {
  const names = lang === "en" ? offering.teacher_en : offering.teacher_zh;
  return (
    (names?.length ? names : offering.teacher_zh)?.join(", ") || unavailable
  );
};

const formatTimesAndVenues = (
  offering: ModuleOffering,
  unavailable: string,
) => {
  const values = offering.times.map((time, index) =>
    `${offering.venues[index] ?? ""} ${time}`.trim(),
  );
  return values.length > 0 ? values.join(" · ") : unavailable;
};

const historyForSemester = (variant: ModuleVariant, semester: string) =>
  variant.history.find((item) => item.semester === semester);

const OfferingCell = ({
  history,
  lang,
  dict,
}: {
  history?: ModuleHistory;
  lang: string;
  dict: ReturnType<typeof useDictionary>;
}) => {
  if (!history) {
    return (
      <span className="text-muted-foreground">
        {dict.course.module.not_available}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">
        {history.offerings.length} {dict.course.module.section_suffix}
      </span>
      <div className="flex flex-wrap gap-1">
        {history.offerings.map((offering) => (
          <Link
            key={offering.raw_id}
            to={offeringLink(lang, offering.raw_id)}
            className="rounded border px-1.5 py-0.5 text-xs text-nthu-600 hover:bg-muted"
          >
            {offering.class === "0"
              ? dict.course.module.default_section
              : `#${offering.class}`}
          </Link>
        ))}
      </div>
    </div>
  );
};

const HistoryGrid = ({
  variant,
  terms,
  lang,
  dict,
}: {
  variant: ModuleVariant;
  terms: SemesterTerm[];
  lang: string;
  dict: ReturnType<typeof useDictionary>;
}) => {
  const years = [...new Set(variant.history.map((item) => item.academicYear))];

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="w-24 border-b px-3 py-2 font-medium">
              {dict.course.module.academic_year}
            </th>
            {terms.map((term) => (
              <th key={term} className="border-b px-3 py-2 font-medium">
                {termLabel(dict, term)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <th className="border-b px-3 py-3 text-left font-medium">
                {year}
              </th>
              {terms.map((term) => {
                const semester = `${year}${term === "fall" ? "10" : term === "spring" ? "20" : "30"}`;
                return (
                  <td key={term} className="border-b px-3 py-3 align-top">
                    <OfferingCell
                      history={historyForSemester(variant, semester)}
                      lang={lang}
                      dict={dict}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OfferingTable = ({
  variant,
  lang,
  dict,
}: {
  variant: ModuleVariant;
  lang: string;
  dict: ReturnType<typeof useDictionary>;
}) => (
  <div className="overflow-x-auto rounded-md border">
    <Table className="min-w-[760px]">
      <TableHeader>
        <TableRow>
          <TableHead>{dict.course.module.semester}</TableHead>
          <TableHead>{dict.course.module.instructor}</TableHead>
          <TableHead>{dict.course.module.time_venue}</TableHead>
          <TableHead>{dict.course.module.language}</TableHead>
          <TableHead>{dict.course.module.credits}</TableHead>
          <TableHead>{dict.course.module.capacity_enrolled}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {variant.offerings.map((offering) => (
          <TableRow key={offering.raw_id}>
            <TableCell className="whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <span>{toPrettySemester(offering.semester)}</span>
                <span className="text-xs text-muted-foreground">
                  {offering.class === "0"
                    ? dict.course.module.default_section
                    : `#${offering.class}`}
                </span>
              </div>
            </TableCell>
            <TableCell>
              {formatInstructors(
                offering,
                lang,
                dict.course.module.not_available,
              )}
            </TableCell>
            <TableCell className="text-sm">
              {formatTimesAndVenues(offering, dict.course.module.not_available)}
            </TableCell>
            <TableCell>
              {offering.language || dict.course.module.not_available}
            </TableCell>
            <TableCell>{offering.credits}</TableCell>
            <TableCell className="whitespace-nowrap">
              {offering.capacity ?? dict.course.module.not_available} /{" "}
              {offering.enrolled}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to={offeringLink(lang, offering.raw_id)}
                  aria-label={`${dict.course.module.view_offering} ${toPrettySemester(offering.semester)}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const VariantPicker = ({
  module,
  selectedVariant,
  dict,
  onChange,
}: {
  module: ModuleAggregate;
  selectedVariant: ModuleVariant;
  dict: ReturnType<typeof useDictionary>;
  onChange: (title: string) => void;
}) => {
  if (module.variants.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <label htmlFor="module-title" className="text-sm font-medium">
        {dict.course.module.variant_picker}
      </label>
      <select
        id="module-title"
        value={selectedVariant.nameZh}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        {module.variants.map((variant) => (
          <option key={variant.titleKey} value={variant.nameZh}>
            {variant.nameZh} — {variant.semesters.length}{" "}
            {dict.course.module.semesters_count}
          </option>
        ))}
      </select>
    </div>
  );
};

const BackToCourses = ({
  lang,
  dict,
}: {
  lang: string;
  dict: ReturnType<typeof useDictionary>;
}) => (
  <Button variant="ghost" asChild size="sm" className="w-fit">
    <Link to={`/${lang}/courses`}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      {dict.common.back}
    </Link>
  </Button>
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

  const genericTitle = `${dict.course.module.title} | NTHUMods`;
  const back = <BackToCourses lang={lang} dict={dict} />;

  if (!moduleKey || !parsedModuleKey) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className="flex flex-col gap-2 px-2">
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
        <div className="flex flex-col gap-2 px-2">
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
        <div className="flex flex-col gap-2 px-2">
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

  const selectedVariant = getModuleVariant(module, requestedTitle);
  if (!selectedVariant) {
    return (
      <>
        <Helmet>
          <title>{genericTitle}</title>
        </Helmet>
        <div className="flex flex-col gap-2 px-2">
          {back}
          <ErrorState title={dict.course.module.no_offerings} />
        </div>
      </>
    );
  }

  const latestOffering = selectedVariant.offerings.at(-1)!;
  const pattern = getOfferingPattern(selectedVariant.semesters);
  const nextOffering = inferNextOffering(selectedVariant.semesters);
  const latestSemester = selectedVariant.semesters.at(-1)!;
  const terms = getAvailableTerms(selectedVariant);
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
      <div className="flex flex-col gap-2 px-2">
        {back}
        <Fade>
          <div className="flex min-w-0 flex-col gap-5 pb-8">
            <header className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {dict.course.module.title}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-2xl font-bold text-nthu-600">
                  {latestOffering.name_zh}
                </h1>
                <Badge variant="outline">
                  {selectedVariant.credits.join(" / ")}{" "}
                  {dict.course.module.credits_unit}
                </Badge>
              </div>
              <h2 className="text-lg font-medium">{latestOffering.name_en}</h2>
              <p className="font-mono text-sm text-muted-foreground">
                {module.department} {module.course}
              </p>
              {selectedVariant.titles.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {dict.course.module.historical_names}:{" "}
                  </span>
                  {selectedVariant.titles
                    .map((title) => title.nameZh)
                    .join("、")}
                </p>
              )}
            </header>

            <VariantPicker
              module={module}
              selectedVariant={selectedVariant}
              dict={dict}
              onChange={(title) => {
                const next = new URLSearchParams(searchParams);
                next.set("title", title);
                setSearchParams(next, { replace: true });
              }}
            />

            {module.variants.length > 1 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {dict.course.module.other_titles}:{" "}
                </span>
                {module.variants
                  .filter((variant) => variant !== selectedVariant)
                  .map((variant) => variant.nameZh)
                  .join("、")}
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {dict.course.module.history}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p>
                  <span className="font-medium">
                    {dict.course.module.pattern}:{" "}
                  </span>
                  {patternLabel(dict, pattern)}
                </p>
                <p>
                  <span className="font-medium">
                    {dict.course.module.likely_next}:{" "}
                  </span>
                  {nextOffering?.kind === "stopped"
                    ? `${dict.course.module.not_offered_since} ${toPrettySemester(nextOffering.semester)}`
                    : nextOffering
                      ? `${toPrettySemester(nextOffering.semester)} (${termLabel(dict, nextOffering.term)})`
                      : dict.course.module.no_clear_pattern}
                </p>
                <p>
                  <span className="font-medium">
                    {dict.course.module.last_recorded}:{" "}
                  </span>
                  {toPrettySemester(latestSemester)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dict.course.module.heuristic_note}
                </p>
              </CardContent>
            </Card>

            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  {dict.course.module.offering_history}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dict.course.module.grid_note}
                </p>
              </div>
              <HistoryGrid
                variant={selectedVariant}
                terms={terms}
                lang={lang}
                dict={dict}
              />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  {dict.course.module.offering_details}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {dict.course.module.data_note}
                </p>
              </div>
              <OfferingTable
                variant={selectedVariant}
                lang={lang}
                dict={dict}
              />
            </section>
          </div>
        </Fade>
      </div>
    </>
  );
};

export default ModulePage;
