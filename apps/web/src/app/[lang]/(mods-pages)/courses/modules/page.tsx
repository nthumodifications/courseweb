import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ModuleTermAvailability } from "@/components/Courses/ModuleTermAvailability";
import { searchModules, type ModuleSearchResult } from "@/lib/modules";

const MODULE_SEARCH_DEBOUNCE_MS = 250;

const ModuleSearchTag = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-[52px] flex-row items-center justify-center space-x-2 rounded-md bg-muted px-1 py-1 text-xs text-foreground select-none">
    {children}
  </div>
);

const ModuleSearchResultRow = ({
  result,
  lang,
}: {
  result: ModuleSearchResult;
  lang: "zh" | "en";
}) => {
  const dict = useDictionary();
  const title = lang === "en" ? result.nameEn || result.nameZh : result.nameZh;
  const instructors = result.instructors
    .map((instructor) =>
      lang === "en"
        ? instructor.nameEn || instructor.nameZh
        : instructor.nameZh,
    )
    .join(lang === "en" ? ", " : "、");
  return (
    <Link
      to={`/${lang}/courses/module/${encodeURIComponent(result.key)}?title=${encodeURIComponent(result.nameZh)}`}
      className="group flex min-w-0 flex-row gap-4 py-4 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 space-y-1">
          <p className="text-nthu-500 text-sm font-bold">
            {result.department} {result.course}
          </p>
          <div className="flex min-w-0 flex-row items-start gap-1 text-left font-bold group-hover:underline">
            <span className="min-w-0 whitespace-normal">{title}</span>
            <ChevronRight
              className="mt-1 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {instructors || dict.course.module.not_available}
            {" · "}
            {dict.course.module.recent_offering}{" "}
            {result.latestSemester.slice(0, 3)}-{result.latestSemester[3]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-sm">
          <ModuleSearchTag>
            {result.credits.join(" / ")} {dict.course.module.credits_unit}
          </ModuleSearchTag>
        </div>
        <ModuleTermAvailability
          semesters={result.semesters}
          size="sm"
          className="mt-2"
        />
      </div>
    </Link>
  );
};

const ModuleSearchSkeleton = () => (
  <div className="flex animate-pulse flex-col gap-4 py-4">
    <div className="h-4 w-28 rounded bg-muted" />
    <div className="h-5 w-3/4 rounded bg-muted" />
    <div className="h-3 w-1/2 rounded bg-muted" />
  </div>
);

const ModulesSearchPage = () => {
  const dict = useDictionary();
  const { lang: rawLang } = useParams<{ lang: string }>();
  const lang = rawLang === "en" ? "en" : "zh";
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(queryFromUrl);
  const [debouncedQuery, setDebouncedQuery] = useState(queryFromUrl);

  useEffect(() => {
    setInputValue(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(inputValue.trim()),
      MODULE_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const query = useQuery({
    queryKey: ["module-search", debouncedQuery],
    queryFn: ({ signal }) => searchModules(debouncedQuery, signal),
    enabled: Boolean(debouncedQuery),
    staleTime: 5 * 60 * 1000,
  });

  const setQuery = (value: string) => {
    setInputValue(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
  };

  return (
    <>
      <Helmet>
        <title>{`${dict.course.module.search_title} | NTHUMods`}</title>
        <meta name="description" content={dict.course.module.search_prompt} />
      </Helmet>
      <div className="flex min-w-0 w-full flex-col gap-4 px-4 md:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-medium">
            {dict.course.module.search_title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dict.course.module.search_description}
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="relative flex w-full items-center gap-1"
        >
          <Input
            value={inputValue}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.course.module.search_placeholder}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1"
            aria-label={dict.course.module.search_placeholder}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            title={dict.common.search}
          >
            <Search size="16" />
          </Button>
        </form>

        {!debouncedQuery ? (
          <section className="flex flex-col gap-3" aria-live="polite">
            <p className="text-sm text-muted-foreground">
              {dict.course.module.search_prompt}
            </p>
            <div className="flex flex-wrap gap-2">
              {dict.course.module.search_examples.map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setQuery(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </section>
        ) : query.isLoading ? (
          <div className="divide-y divide-border" aria-live="polite">
            <ModuleSearchSkeleton />
            <ModuleSearchSkeleton />
            <ModuleSearchSkeleton />
          </div>
        ) : query.error ? (
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                {dict.common.try_again}
              </Button>
            }
          />
        ) : query.data?.length === 0 ? (
          <EmptyState title={dict.course.module.search_no_results} />
        ) : (
          <section aria-live="polite">
            <p className="mb-2 text-sm text-muted-foreground">
              {query.data?.length} {dict.course.module.search_results}
            </p>
            <div className="divide-y divide-border">
              {query.data?.map((result) => (
                <ModuleSearchResultRow
                  key={`${result.key}:${result.titleKey}`}
                  result={result}
                  lang={lang}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default ModulesSearchPage;
