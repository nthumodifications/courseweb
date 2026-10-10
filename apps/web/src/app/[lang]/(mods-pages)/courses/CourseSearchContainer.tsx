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
import SearchContainer from "./SearchContainer";
import { lastSemester } from "@courseweb/shared";
import CourseSidePanel from "./CourseSidePanel";
import { createResilientSearchClient } from "@/lib/search-client";
import useDictionary from "@/dictionaries/useDictionary";

const searchClient = createResilientSearchClient();
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

const CourseSearchContainer = () => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [searchParams] = useSearchParams();
  const { language } = useSettings();
  const dict = useDictionary();
  const department = searchParams.get("department");

  const initialUiState = useMemo(
    () => ({
      nthu_courses: {
        menu: {
          semester: lastSemester.id,
        },
      },
    }),
    [],
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
        {JSON.stringify([
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
            inLanguage: language === "en" ? "en-US" : "zh-TW",
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
        routing={true}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
        stalledSearchDelay={500}
      >
        <div className="flex min-w-0 flex-col h-full max-h-[95dvh] gap-4">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel className="flex min-w-0 gap-4">
              <SearchContainer
                searchClient={searchClient}
                sessionStorageCache={sessionStorageCache}
              />
            </ResizablePanel>

            <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-4 rounded-full bg-muted" />

            <ResizablePanel
              collapsible={true}
              collapsedSize={0}
              minSize={30}
              defaultSize={isDesktop ? 30 : 0}
              className="hidden md:block pr-1"
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
