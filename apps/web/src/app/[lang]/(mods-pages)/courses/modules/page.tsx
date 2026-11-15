import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, EmptyState, ErrorState, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ModuleTermDots } from "@/components/Courses/ModuleTermAvailability";
import { searchModules, type ModuleSearchResult } from "@/lib/modules";
import { contentLanguage } from "@/helpers/contentLanguage";
import type { Language } from "@/types/settings";

const MODULE_SEARCH_DEBOUNCE_MS = 250;

const ModuleSearchResultRow = ({
  result,
  lang,
}: {
  result: ModuleSearchResult;
  lang: Language;
}) => {
  const dict = useDictionary();
  const contentLang = contentLanguage(lang);
  const title =
    contentLang === "en" ? result.nameEn || result.nameZh : result.nameZh;
  const instructors = result.instructors
    .map((instructor) =>
      contentLang === "en"
        ? instructor.nameEn || instructor.nameZh
        : instructor.nameZh,
    )
    .join(contentLang === "en" ? ", " : "、");
  const latestOffering = `${result.latestSemester.slice(0, 3)}-${result.latestSemester[3]}`;
  return (
    <Link
      to={`/${lang}/courses/module/${encodeURIComponent(result.key)}?title=${encodeURIComponent(result.nameZh)}`}
      title={instructors || dict.course.module.not_available}
      className="group flex min-h-14 min-w-0 items-center gap-2 py-2 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 sm:gap-3"
    >
      <span className="w-[5.25rem] shrink-0 font-mono text-sm tabular-nums text-muted-foreground sm:w-24">
        {result.department} {result.course}
      </span>
      <span
        title={title}
        className="min-w-0 flex-1 truncate font-medium group-hover:underline"
      >
        {title}
      </span>
      <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
        {result.credits.join(contentLang === "en" ? "/" : "、")}{" "}
        {dict.course.module.credits_unit}
      </span>
      <ModuleTermDots semesters={result.semesters} />
      <span className="flex min-w-0 max-w-[25%] shrink-0 items-center gap-1 text-xs text-muted-foreground sm:max-w-[34%]">
        <span className="shrink-0 tabular-nums">{latestOffering}</span>
        <span
          title={instructors || dict.course.module.not_available}
          className="min-w-0 truncate"
        >
          {instructors || dict.course.module.not_available}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
};

const ModuleSearchSkeleton = () => (
  <div className="flex h-14 animate-pulse items-center gap-3">
    <div className="h-4 w-20 rounded bg-muted" />
    <div className="h-4 flex-1 rounded bg-muted" />
    <div className="h-4 w-16 rounded bg-muted" />
  </div>
);

const ModulesSearchPage = () => {
  const dict = useDictionary();
  const { lang: rawLang } = useParams<{ lang: string }>();
  const lang = rawLang === "en" || rawLang === "zh-cn" ? rawLang : "zh";
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
      </Helmet>
      <div className="flex min-w-0 w-full flex-col gap-4 px-4 md:px-6">
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
          <section className="flex flex-col gap-2" aria-live="polite">
            <p className="text-sm text-muted-foreground">
              {dict.course.module.search_examples_label}
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {dict.course.module.search_examples.map((example) => (
                <Link
                  key={example}
                  to={`/${lang}/courses/modules?q=${encodeURIComponent(example)}`}
                  className="min-h-10 py-2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {example}
                </Link>
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
        <div className="h-6" aria-hidden="true" />
      </div>
    </>
  );
};

export default ModulesSearchPage;
