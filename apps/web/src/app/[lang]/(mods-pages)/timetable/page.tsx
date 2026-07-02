import Timetable from "@/components/Timetable/Timetable";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalStorage } from "usehooks-ts";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import TimetableSidebar from "@/components/Timetable/TimetableSidebar";
import { useSwipeable } from "react-swipeable";
import { semesterInfo } from "@courseweb/shared";
import { useHeaderPortal } from "@/components/Portal/HeaderPortal";
import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSettings } from "@/hooks/contexts/settings";
import { timetableEvents } from "@/lib/trackingEvents";
import TimetableAgenda from "@/components/Timetable/TimetableAgenda";
import TimetableTimeline from "@/components/Timetable/TimetableTimeline";
import TimetableDots from "@/components/Timetable/TimetableDots";
import TimetableDayCards from "@/components/Timetable/TimetableDayCards";
import { LayoutGrid, List, Clock, Grid3X3, Columns2 } from "lucide-react";

const TimetablePage = () => {
  const { getSemesterCourses, semester, setSemester, colorMap } =
    useUserTimetable();
  const [vertical, setVertical] = useLocalStorage("timetable_vertical", true);
  const [viewMode, setViewMode] = useLocalStorage<
    "grid" | "agenda" | "timeline" | "dots" | "day-cards"
  >("timetable_view_mode", "grid");
  const { language } = useSettings();
  const { setPortalContent, clearPortalContent } = useHeaderPortal();
  const previousSemesterRef = useRef(semester);

  const timetableData = createTimetableFromCourses(
    getSemesterCourses(semester) as MinimalCourse[],
    colorMap,
  );

  // Track page view and semester changes
  useEffect(() => {
    // Track initial page view
    timetableEvents.viewPlanner?.();
  }, []);

  // Track semester switches
  useEffect(() => {
    if (previousSemesterRef.current !== semester) {
      timetableEvents.switchSemester(previousSemesterRef.current, semester);
      previousSemesterRef.current = semester;
    }
  }, [semester]);

  // Track view changes
  useEffect(() => {
    const viewType = vertical ? "vertical" : "horizontal";
    timetableEvents.changeView(viewType);
  }, [vertical]);

  // Set the SemesterSwitcher in the header portal
  useEffect(() => {
    setPortalContent(
      <div className="flex items-center justify-center w-full gap-3">
        <SemesterSwitcher semester={semester} setSemester={setSemester} />
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            title="Grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`p-1.5 rounded ${viewMode === "agenda" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            title="Agenda"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`p-1.5 rounded ${viewMode === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            title="Timeline"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("dots")}
            className={`p-1.5 rounded ${viewMode === "dots" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            title="Dots"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("day-cards")}
            className={`p-1.5 rounded ${viewMode === "day-cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            title="Day Cards"
          >
            <Columns2 className="h-4 w-4" />
          </button>
        </div>
      </div>,
    );

    // Clean up when component unmounts
    return () => {
      clearPortalContent();
    };
  }, [semester, setSemester, viewMode, setViewMode]);

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const currentSemesterIndex = semesterInfo.findIndex(
        (semObj) => semObj.id === semester,
      );
      if (currentSemesterIndex < semesterInfo.length - 1) {
        setSemester(semesterInfo[currentSemesterIndex + 1].id);
      }
    },
    onSwipedRight: (eventData) => {
      const currentSemesterIndex = semesterInfo.findIndex(
        (semObj) => semObj.id === semester,
      );
      if (currentSemesterIndex > 0) {
        setSemester(semesterInfo[currentSemesterIndex - 1].id);
      }
    },
  });

  const timetableJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "NTHUMods 課表系統",
      url: "https://nthumods.com/zh/timetable",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web Browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "課表管理 | NTHUMods",
      description: "智慧排課系統，輕鬆管理清華大學課程時間表",
      url: `https://nthumods.com/${language}/timetable`,
      inLanguage: language === "en" ? "en-US" : "zh-TW",
      isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
    },
  ];

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(timetableJsonLd)}
        </script>
      </Helmet>
      <div className="flex flex-col w-full h-full">
        <div
          className={`grid grid-cols-1 md:grid-rows-1 ${viewMode === "grid" && vertical ? "md:grid-cols-[3fr_2fr]" : ""} px-1 py-4 md:p-4 gap-4 md:gap-2`}
        >
          <div
            className="w-full h-full"
            {...(viewMode === "grid" ? handlers : {})}
          >
            {viewMode === "agenda" ? (
              <TimetableAgenda timetableData={timetableData} />
            ) : viewMode === "timeline" ? (
              <TimetableTimeline timetableData={timetableData} />
            ) : viewMode === "dots" ? (
              <TimetableDots timetableData={timetableData} />
            ) : viewMode === "day-cards" ? (
              <TimetableDayCards timetableData={timetableData} />
            ) : (
              <Timetable
                timetableData={timetableData}
                vertical={vertical}
                renderTimetableSlot={renderTimetableSlot}
              />
            )}
          </div>
          <TimetableSidebar vertical={vertical} setVertical={setVertical} />
        </div>
      </div>
    </>
  );
};

export default TimetablePage;
