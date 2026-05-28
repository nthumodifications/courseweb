import { useQuery } from "@tanstack/react-query";
import {
  getMainBuses,
  getNandaBuses,
  getRoute1Buses,
  getRoute2Buses,
} from "@/libs/bus";
import BusDetailsContainer from "./BusDetailsContainer";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import { useParams, useNavigate } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { useEffect } from "react";
import { Language } from "@/types/settings";
import { Helmet } from "react-helmet-async";

type BusRouteDetailsPageProps = {
  params: {
    route: string;
  };
};

const BusRouteDetailsPage = () => {
  const { lang, route } = useParams() as { lang: Language; route: string };
  const dict = useDictionary();
  const navigate = useNavigate();

  const routeNames: Record<string, { zh: string; en: string }> = {
    main: { zh: "校園公車", en: "Main Campus Bus" },
    nanda: { zh: "南大校區區間車", en: "Nanda Campus Shuttle" },
  };
  const routeInfo = routeNames[route] ?? { zh: "校車", en: "Campus Bus" };
  const routeName = lang === "zh" ? routeInfo.zh : routeInfo.en;

  const busRouteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首頁",
          item: `https://nthumods.com/${lang}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "校車",
          item: `https://nthumods.com/${lang}/bus`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: routeName,
          item: `https://nthumods.com/${lang}/bus/${route}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${routeName} - 校車時刻表 | NTHUMods`,
      description: `查看清華大學校車${routeName}即時時刻表、路線圖與站點資訊`,
      url: `https://nthumods.com/${lang}/bus/${route}`,
      inLanguage: lang === "en" ? "en-US" : "zh-TW",
      isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
    },
  ];

  const seoHelmet = (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(busRouteJsonLd)}
      </script>
    </Helmet>
  );

  // Redirect to main bus page if route is invalid
  useEffect(() => {
    if (!["main", "nanda", "route1", "route2"].includes(route)) {
      navigate(`/${lang}/bus`);
    }
  }, [route, lang, navigate]);

  const {
    data: mainBusData,
    isLoading: isMainBusLoading,
    error: mainBusError,
  } = useQuery({
    queryKey: ["mainBuses"],
    queryFn: getMainBuses,
    enabled: route === "main",
  });

  const {
    data: nandaBusData,
    isLoading: isNandaBusLoading,
    error: nandaBusError,
  } = useQuery({
    queryKey: ["nandaBuses"],
    queryFn: getNandaBuses,
    enabled: route === "nanda",
  });

  const {
    data: route1BusData,
    isLoading: isRoute1BusLoading,
    error: route1BusError,
  } = useQuery({
    queryKey: ["route1Buses"],
    queryFn: getRoute1Buses,
    enabled: route === "route1",
  });

  const {
    data: route2BusData,
    isLoading: isRoute2BusLoading,
    error: route2BusError,
  } = useQuery({
    queryKey: ["route2Buses"],
    queryFn: getRoute2Buses,
    enabled: route === "route2",
  });

  // Loading state
  if (
    isMainBusLoading ||
    isNandaBusLoading ||
    isRoute1BusLoading ||
    isRoute2BusLoading
  ) {
    return (
      <>
        {seoHelmet}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500"></div>
        </div>
      </>
    );
  }

  // Error state
  if (mainBusError || nandaBusError || route1BusError || route2BusError) {
    return (
      <>
        {seoHelmet}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-red-500">
            Failed to load bus data. Please try again later.
          </div>
        </div>
      </>
    );
  }

  if (route === "main" && mainBusData) {
    return (
      <>
        {seoHelmet}
        <BusDetailsContainer
          routes={[
            {
              Icon: RedLineIcon,
              title: dict.bus.red_line,
            },
            {
              Icon: GreenLineIcon,
              title: dict.bus.green_line,
            },
          ]}
          up={{
            title: dict.bus.to + dict.bus.tsmc,
            info: mainBusData.toward_TSMC_building_info,
            weekday: mainBusData.weekday_bus_schedule_toward_TSMC_building,
            weekend: mainBusData.weekend_bus_schedule_toward_TSMC_building,
          }}
          down={{
            title: dict.bus.to + dict.bus.north_gate,
            info: mainBusData.toward_main_gate_info,
            weekday: mainBusData.weekday_bus_schedule_toward_main_gate,
            weekend: mainBusData.weekend_bus_schedule_toward_main_gate,
          }}
        />
      </>
    );
  } else if (route === "nanda" && nandaBusData) {
    return (
      <>
        {seoHelmet}
        <BusDetailsContainer
          routes={[
            {
              Icon: Route1LineIcon,
              title: dict.bus.route1_line,
            },
            {
              Icon: Route2LineIcon,
              title: dict.bus.route2_line,
            },
          ]}
          up={{
            title: dict.bus.to + dict.bus.nanda,
            info: nandaBusData.toward_south_campus_info,
            weekday: nandaBusData.weekday_bus_schedule_toward_south_campus,
            weekend: nandaBusData.weekend_bus_schedule_toward_south_campus,
          }}
          down={{
            title: dict.bus.to + dict.bus.main_campus,
            info: nandaBusData.toward_main_campus_info,
            weekday: nandaBusData.weekday_bus_schedule_toward_main_campus,
            weekend: nandaBusData.weekend_bus_schedule_toward_main_campus,
          }}
        />
      </>
    );
  }

  // Fallback - should not reach here due to redirect effect
  return seoHelmet;
};

export default BusRouteDetailsPage;
