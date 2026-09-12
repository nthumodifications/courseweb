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
import {
  Button,
  PageHeader,
  PageShell,
  PageSkeleton,
} from "@courseweb/ui";
import ErrorState from "@/components/Pages/ErrorState";
import { ChevronLeft } from "lucide-react";

type BusRouteDetailsPageProps = {
  params: {
    route: string;
  };
};

const BusRouteDetailsPage = () => {
  const { lang, route } = useParams() as { lang: Language; route: string };
  const dict = useDictionary();
  const navigate = useNavigate();

  const routeNames: Record<string, string> = {
    main: dict.bus.route_main,
    nanda: dict.bus.route_nanda,
    route1: dict.bus.route1_line,
    route2: dict.bus.route2_line,
  };
  const routeName = routeNames[route] ?? dict.bus.route_default;

  const busRouteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "NTHUMods",
          item: `https://nthumods.com/${lang}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: dict.bus.title,
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
      name: `${routeName} - ${dict.bus.title} | NTHUMods`,
      description: dict.bus.description,
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
    refetch: refetchMain,
  } = useQuery({
    queryKey: ["mainBuses"],
    queryFn: getMainBuses,
    enabled: route === "main",
  });

  const {
    data: nandaBusData,
    isLoading: isNandaBusLoading,
    error: nandaBusError,
    refetch: refetchNanda,
  } = useQuery({
    queryKey: ["nandaBuses"],
    queryFn: getNandaBuses,
    enabled: route === "nanda",
  });

  const {
    data: route1BusData,
    isLoading: isRoute1BusLoading,
    error: route1BusError,
    refetch: refetchRoute1,
  } = useQuery({
    queryKey: ["route1Buses"],
    queryFn: getRoute1Buses,
    enabled: route === "route1",
  });

  const {
    data: route2BusData,
    isLoading: isRoute2BusLoading,
    error: route2BusError,
    refetch: refetchRoute2,
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
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader title={routeName} />
        <PageSkeleton rows={6} />
      </PageShell>
    );
  }

  // Error state
  if (mainBusError || nandaBusError || route1BusError || route2BusError) {
    return (
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader title={routeName} />
        <ErrorState
          title={dict.bus.load_error_title}
          description={dict.bus.load_error_description}
          retryLabel={dict.common.try_again}
          onRetry={() => {
            void Promise.all([
              refetchMain(),
              refetchNanda(),
              refetchRoute1(),
              refetchRoute2(),
            ]);
          }}
        />
      </PageShell>
    );
  }

  if (route === "main" && mainBusData) {
    return (
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader
          title={routeName}
          actions={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={dict.common.back}
              title={dict.common.back}
              onClick={() => navigate(`/${lang}/bus`)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          }
        />
        <BusDetailsContainer
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
      </PageShell>
    );
  } else if (route === "nanda" && nandaBusData) {
    return (
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader
          title={routeName}
          actions={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={dict.common.back}
              title={dict.common.back}
              onClick={() => navigate(`/${lang}/bus`)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          }
        />
        <BusDetailsContainer
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
      </PageShell>
    );
  } else if (route === "route1" && route1BusData) {
    return (
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader
          title={routeName}
          actions={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={dict.common.back}
              title={dict.common.back}
              onClick={() => navigate(`/${lang}/bus`)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          }
        />
        <BusDetailsContainer
          up={{
            title: dict.bus.to + dict.bus.nanda,
            info: route1BusData.toward_south_campus_info,
            weekday: route1BusData.weekday_bus_schedule_toward_south_campus,
            weekend: route1BusData.weekend_bus_schedule_toward_south_campus,
          }}
          down={{
            title: dict.bus.to + dict.bus.main_campus,
            info: route1BusData.toward_main_campus_info,
            weekday: route1BusData.weekday_bus_schedule_toward_main_campus,
            weekend: route1BusData.weekend_bus_schedule_toward_main_campus,
          }}
        />
      </PageShell>
    );
  } else if (route === "route2" && route2BusData) {
    return (
      <PageShell width="full" gap={false}>
        {seoHelmet}
        <PageHeader
          title={routeName}
          actions={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={dict.common.back}
              title={dict.common.back}
              onClick={() => navigate(`/${lang}/bus`)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          }
        />
        <BusDetailsContainer
          up={{
            title: dict.bus.to + dict.bus.nanda,
            info: route2BusData.toward_south_campus_info,
            weekday: route2BusData.weekday_bus_schedule_toward_south_campus,
            weekend: route2BusData.weekend_bus_schedule_toward_south_campus,
          }}
          down={{
            title: dict.bus.to + dict.bus.main_campus,
            info: route2BusData.toward_main_campus_info,
            weekday: route2BusData.weekday_bus_schedule_toward_main_campus,
            weekend: route2BusData.weekend_bus_schedule_toward_main_campus,
          }}
        />
      </PageShell>
    );
  }

  // Fallback - should not reach here due to redirect effect
  return seoHelmet;
};

export default BusRouteDetailsPage;
