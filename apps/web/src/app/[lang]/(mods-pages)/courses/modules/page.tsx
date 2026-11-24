import { ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { ModuleTermAvailability } from "@/components/Courses/ModuleTermAvailability";
import type { ModuleSearchResult } from "@/lib/modules";
import { contentLanguage } from "@/helpers/contentLanguage";
import type { Language } from "@/types/settings";
import { useFillViewportHeight } from "@/hooks/useFillViewportHeight";
import ModuleSearchContainer, {
  type ModuleSearchHit,
} from "./ModuleSearchContainer";

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

const ModulesSearchPage = () => {
  const dict = useDictionary();
  const { lang: rawLang } = useParams<{ lang: string }>();
  const { ref, height } = useFillViewportHeight<HTMLDivElement>();
  const lang = rawLang === "en" || rawLang === "zh-cn" ? rawLang : "zh";

  return (
    <>
      <Helmet>
        <title>{`${dict.course.module.search_title} | NTHUMods`}</title>
      </Helmet>
      <div
        ref={ref}
        data-module-search-viewport
        className="min-w-0 md:min-h-0 md:overflow-hidden md:pb-4"
        style={height == null ? undefined : { height }}
      >
        <ModuleSearchContainer
          renderRow={(hit: ModuleSearchHit) => (
            <ModuleSearchResultRow result={hit} lang={lang} />
          )}
        />
      </div>
    </>
  );
};

export default ModulesSearchPage;
