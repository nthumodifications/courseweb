import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@courseweb/ui";
import { useMediaQuery } from "usehooks-ts";
import { InstantSearch } from "react-instantsearch";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSettings } from "@/hooks/contexts/settings";
import {
  useLocalizedZhData,
  useLocalizedZhQuery,
} from "@/hooks/useLocalizedZh";
import SearchContainer from "./SearchContainer";
import CourseSidePanel from "./CourseSidePanel";
import { createResilientSearchClient } from "@/lib/search-client";
import useDictionary from "@/dictionaries/useDictionary";
import { intlLocale } from "@/helpers/contentLanguage";
import { createCourseSearchRouter } from "@/components/Courses/courseSearchRouting";
import { serializeJsonLd } from "@/lib/seo";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const sessionStorageCache = createInfiniteHitsSessionStorageCache();

const CourseSearchContainer = () => {
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const [searchParams] = useSearchParams();
  const { language } = useSettings();
  const localizeQuery = useLocalizedZhQuery();
  const localizeSearchText = useLocalizedZhData();
  const searchClient = useMemo(
    () =>
      createResilientSearchClient({
        localQueryTransform: localizeQuery,
        localSearchTextTransform: localizeSearchText,
      }),
    [localizeQuery, localizeSearchText],
  );
  const dict = useDictionary();
  const defaultSemester = useDefaultSemesterId();
  const department = searchParams.get("department");
  const routing = useMemo(() => ({ router: createCourseSearchRouter() }), []);

  const initialUiState = useMemo(
    () => ({
      nthu_courses: {
        menu: {
          semester: defaultSemester,
        },
      },
    }),
    [defaultSemester],
  );

  const departmentHelmet = department ? (
    <Helmet>
      <title>{dict.course.seo.title.replace("{department}", department)}</title>
      <meta
        name="description"
        content={dict.course.seo.description.replace(
          "{department}",
          department,
        )}
      />
      <link
        rel="canonical"
        href={`https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}`}
      />
      <meta property="og:type" content="website" />
      <script type="application/ld+json">
        {serializeJsonLd([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: dict.course.seo.home,
                item: `https://nthumods.com/${language}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: dict.course.seo.course_breadcrumb,
                item: `https://nthumods.com/${language}/courses`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: department,
                item: `https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: dict.course.seo.title.replace("{department}", department),
            description: dict.course.seo.page_description.replace(
              "{department}",
              department,
            ),
            url: `https://nthumods.com/${language}/courses?department=${encodeURIComponent(department)}`,
            inLanguage: intlLocale(language),
            isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
          },
        ])}
      </script>
    </Helmet>
  ) : null;

  return (
    <>
      {departmentHelmet}
      <InstantSearch
        searchClient={searchClient}
        indexName="nthu_courses"
        initialUiState={initialUiState}
        routing={routing}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
        stalledSearchDelay={500}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full min-h-0 w-full min-w-0"
          >
            <ResizablePanel minSize={55} className="min-h-0 min-w-0">
              <SearchContainer
                searchClient={searchClient}
                sessionStorageCache={sessionStorageCache}
              />
            </ResizablePanel>

            <ResizableHandle className="hidden h-48 self-center rounded-full bg-muted px-[2px] outline-none mx-4 my-4 xl:block" />

            <ResizablePanel
              collapsible={true}
              collapsedSize={0}
              minSize={20}
              defaultSize={isDesktop ? 25 : 0}
              className="hidden min-h-0 min-w-[16rem] pr-1 xl:block"
            >
              <CourseSidePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </InstantSearch>
    </>
  );
};

export default CourseSearchContainer;
