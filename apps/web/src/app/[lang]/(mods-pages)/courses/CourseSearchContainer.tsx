import { createInfiniteHitsSessionStorageCache } from "instantsearch.js/es/lib/infiniteHitsCache";
import algoliasearch from "algoliasearch/lite";
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
import useDictionary from "@/dictionaries/useDictionary";
import CourseSidePanel from "./CourseSidePanel";

const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID!,
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY!,
);
const sessionStorageCache = createInfiniteHitsSessionStorageCache();

const CourseSearchContainer = () => {
  const dict = useDictionary();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [searchParams] = useSearchParams();
  const { language } = useSettings();
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
      <title>{`清華大學${department}課程列表 | NTHUMods`}</title>
      <meta
        name="description"
        content={`瀏覽清華大學${department}所有課程，搜尋選課資訊。`}
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
                name: "首頁",
                item: `https://nthumods.com/${language}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "課程",
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
            name: `${department}課程列表 | NTHUMods`,
            description: `瀏覽清華大學${department}所有課程`,
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
        <div className="flex flex-col h-full max-h-[95dvh] gap-4 md:gap-8">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel className="flex gap-4">
              <SearchContainer
                searchClient={searchClient}
                sessionStorageCache={sessionStorageCache}
              />
            </ResizablePanel>

            <ResizableHandle className="hidden md:block outline-none self-center px-[2px] h-48 mx-4 my-8 rounded-full bg-muted" />

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
