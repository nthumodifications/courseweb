import { useSettings } from "@/hooks/contexts/settings";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsList, TabsTrigger } from "@courseweb/ui";
import { useEffect, useMemo, useState } from "react";
import useTime from "@/hooks/useTime";
import { useQuery } from "@tanstack/react-query";
import { getAllBusData } from "@/libs/bus";
import { addMinutes, differenceInMinutes, format, isWeekend } from "date-fns";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTimeOnDate } from "@/helpers/bus";
import useDictionary from "@/dictionaries/useDictionary";
import OpenCollectiveSponsorBanner from "@/components/Sponsorship/OpenCollectiveSponsorBanner";
import {
  BusListingItem,
  type BusListingItemProps,
} from "@/features/bus/BusListingItem";
import CityBusCatalogue, {
  CityBusSelectedLines,
} from "@/features/bus/CityBusCatalogue";
import { useBusPins, type CampusBusPin } from "@/features/bus/busPins";
import type { CompleteBusData } from "@/libs/bus";

function selectedCampusBus(
  pin: CampusBusPin,
  busData: CompleteBusData,
  time: Date,
  weektype: "weekday" | "weekend",
  dict: ReturnType<typeof useDictionary>,
): Omit<BusListingItemProps, "refTime"> {
  const mainDirection =
    pin.direction === "up" ? "toward_TSMC_building" : "toward_main_gate";
  const nandaDirection =
    pin.direction === "up" ? "toward_south_campus" : "toward_main_campus";
  const schedule =
    pin.line === "red" || pin.line === "green"
      ? busData.main[weektype][mainDirection].filter(
          (bus) => bus.route === "校園公車" && bus.line === pin.line,
        )
      : busData.nanda[weektype][nandaDirection].filter(
          (bus) => bus.type === pin.line,
        );
  const next = schedule
    .filter((bus) => getTimeOnDate(time, bus.time).getTime() >= time.getTime())
    .sort(
      (a, b) =>
        getTimeOnDate(time, a.time).getTime() -
        getTimeOnDate(time, b.time).getTime(),
    )[0];
  const lineTitle =
    pin.line === "red"
      ? dict.bus.red_line
      : pin.line === "green"
        ? dict.bus.green_line
        : pin.line === "route1"
          ? dict.bus.route1_line
          : dict.bus.route2_line;
  const isNanda = pin.line === "route1" || pin.line === "route2";
  return {
    tab: isNanda ? "nanda" : pin.direction === "up" ? "north_gate" : "tsmc",
    startTime: next?.time ?? "0:00",
    Icon:
      pin.line === "red"
        ? RedLineIcon
        : pin.line === "green"
          ? GreenLineIcon
          : pin.line === "route1"
            ? Route1LineIcon
            : Route2LineIcon,
    line: pin.line,
    direction: pin.direction,
    title: lineTitle,
    destination: isNanda
      ? `${dict.bus.to}${
          pin.direction === "up" ? dict.bus.nanda : dict.bus.main_campus
        }`
      : undefined,
    notes: next?.description ? [next.description] : [],
    arrival: next?.time ?? dict.bus.service_over,
    pin,
  };
}

const BusPage = () => {
  const { language } = useSettings();
  const time = useTime();
  const dict = useDictionary();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("north_gate");
  const navigate = useNavigate();
  const { pins, toggle: togglePin } = useBusPins();
  useEffect(() => {
    if (searchParams.has("tab")) {
      setTab(searchParams.get("tab") as string);
    }
  }, [searchParams]);

  const weektype = isWeekend(time) ? "weekend" : "weekday";

  const {
    data: busData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["all_bus_data"],
    queryFn: getAllBusData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: tab !== "city",
  });

  const isCampusLoading = tab !== "city" && isLoading;
  const campusError = tab !== "city" && error;

  const selectedCampusBuses = useMemo(
    () =>
      busData
        ? pins
            .filter((pin): pin is CampusBusPin => pin.kind === "campus")
            .map((pin) => ({
              ...selectedCampusBus(pin, busData, time, weektype, dict),
              isPinned: true,
              onTogglePin: togglePin,
            }))
        : [],
    [busData, dict, language, pins, time, togglePin, weektype],
  );

  const displayBuses = useMemo(() => {
    if (!busData) return [];

    const returnData: Omit<BusListingItemProps, "refTime">[] = [];

    const currentDayData =
      weektype === "weekend" ? busData.main.weekend : busData.main.weekday;
    const currentNandaData =
      weektype === "weekend" ? busData.nanda.weekend : busData.nanda.weekday;

    if (tab === "north_gate") {
      // Handle main campus buses (red/green lines)
      for (const bus of currentDayData.toward_TSMC_building.filter(
        (bus: any) =>
          differenceInMinutes(
            getTimeOnDate(time, bus.time).getTime(),
            time.getTime(),
          ) >= 0,
      )) {
        if (bus.route === "校園公車") {
          const notes = [];
          if (bus.description) notes.push(bus.description);
          if (bus.dep_stop === "綜二 ")
            notes.push(language == "zh" ? "綜二發車" : "Dep. from GEN II");
          if (bus.line === "red") {
            if (returnData.some((bus) => bus.line === "red")) continue;
            returnData.push({
              tab: "north_gate",
              Icon: RedLineIcon,
              startTime: bus.time,
              line: "red",
              direction: "up",
              title: dict.bus.red_line,
              notes,
              arrival: bus.time,
            });
          } else if (bus.line === "green") {
            if (returnData.some((bus) => bus.line === "green")) continue;
            returnData.push({
              tab: "north_gate",
              Icon: GreenLineIcon,
              startTime: bus.time,
              line: "green",
              direction: "up",
              title: dict.bus.green_line,
              notes,
              arrival: bus.time,
            });
          }
        }
      }

      // Handle Route1 buses separately
      for (const bus of currentNandaData.toward_south_campus.filter(
        (bus: any) =>
          bus.type === "route1" &&
          differenceInMinutes(
            getTimeOnDate(time, bus.time).getTime(),
            time.getTime(),
          ) >= 0,
      )) {
        if (returnData.some((bus) => bus.line === "route1")) continue;
        if (bus.description == "週五停駛" && time.getDay() === 5) continue;
        const notes = [];
        if (bus.description.includes("83號"))
          notes.push(language == "zh" ? "83號" : "Bus 83");
        returnData.push({
          tab: "north_gate",
          Icon: Route1LineIcon,
          startTime: bus.time,
          line: "route1",
          direction: "up",
          title: dict.bus.route1_line,
          destination: language == "zh" ? "往南大校區" : "To Nanda",
          notes,
          arrival: bus.time,
        });
      }

      // Handle Route2 buses separately
      for (const bus of currentNandaData.toward_south_campus.filter(
        (bus: any) =>
          bus.type === "route2" &&
          differenceInMinutes(
            getTimeOnDate(time, bus.time).getTime(),
            time.getTime(),
          ) >= 0,
      )) {
        if (returnData.some((bus) => bus.line === "route2")) continue;
        if (bus.description == "週五停駛" && time.getDay() === 5) continue;
        const notes = [];
        if (bus.description.includes("83號"))
          notes.push(language == "zh" ? "83號" : "Bus 83");
        returnData.push({
          tab: "north_gate",
          Icon: Route2LineIcon,
          startTime: bus.time,
          line: "route2",
          direction: "up",
          title: dict.bus.route2_line,
          destination: language == "zh" ? "往南大校區" : "To Nanda",
          notes,
          arrival: bus.time,
        });
      }
    } else if (tab === "tsmc") {
      // SCHOOL BUS DOWNHILL FROM TSMC
      for (const bus of currentDayData.toward_main_gate.filter(
        (bus: any) => getTimeOnDate(time, bus.time).getTime() > time.getTime(),
      )) {
        if (bus.route === "校園公車") {
          const notes = [];
          if (bus.description) notes.push(bus.description);
          if (bus.dep_stop === "綜二 ")
            notes.push(language == "zh" ? "綜二發車" : "Dep. from GEN II");
          if (bus.line === "red") {
            if (returnData.some((bus) => bus.line === "red")) continue;
            returnData.push({
              tab: "tsmc",
              Icon: RedLineIcon,
              startTime: bus.time,
              line: "red",
              direction: "down",
              title: dict.bus.red_line,
              notes,
              arrival: bus.time,
            });
          } else if (bus.line === "green") {
            if (returnData.some((bus) => bus.line === "green")) continue;
            returnData.push({
              tab: "tsmc",
              Icon: GreenLineIcon,
              startTime: bus.time,
              line: "green",
              direction: "down",
              title: dict.bus.green_line,
              notes,
              arrival: bus.time,
            });
          }
        }

        // ROUTE 1 BUS UPHILL TO NANDA (filter busses that left 7 minutes ago, and new time is arrive time + 7 minutes)
        for (const bus of currentNandaData.toward_south_campus.filter(
          (bus: any) =>
            bus.type === "route1" &&
            addMinutes(getTimeOnDate(time, bus.time).getTime(), 7).getTime() >
              time.getTime(),
        )) {
          if (returnData.some((bus) => bus.line === "route1")) continue;
          if (bus.description == "週五停駛" && time.getDay() === 5) continue;
          const notes = [];
          if (bus.description.includes("83號"))
            notes.push(language == "zh" ? "83號" : "Bus 83");
          returnData.push({
            tab: "tsmc",
            Icon: Route1LineIcon,
            startTime: bus.time,
            line: "route1",
            direction: "up",
            title: dict.bus.route1_line,
            destination: language == "zh" ? "往南大校區" : "To Nanda",
            notes,
            arrival: format(
              addMinutes(getTimeOnDate(time, bus.time).getTime(), 7),
              "H:mm",
            ),
          });
        }
      }

      //sort by time
      returnData.sort((a, b) => {
        return (
          getTimeOnDate(time, a.arrival).getTime() -
          getTimeOnDate(time, b.arrival).getTime()
        );
      });
    } else if (tab === "nanda") {
      // Handle Route 1 downhill buses
      for (const bus of currentNandaData.toward_main_campus.filter(
        (bus: any) =>
          bus.type === "route1" &&
          getTimeOnDate(time, bus.time).getTime() > time.getTime(),
      )) {
        if (returnData.some((bus) => bus.line === "route1")) continue;
        if (bus.description == "週五停駛" && time.getDay() === 5) continue;
        const notes = [];
        if (bus.description.includes("83號"))
          notes.push(language == "zh" ? "83號" : "Bus 83");
        returnData.push({
          tab: "nanda",
          Icon: Route1LineIcon,
          startTime: bus.time,
          line: "route1",
          direction: "down",
          title: dict.bus.route1_line,
          destination: language == "zh" ? "往校本部" : "To Main Campus",
          notes,
          arrival: bus.time,
        });
      }

      // Handle Route 2 downhill buses
      for (const bus of currentNandaData.toward_main_campus.filter(
        (bus: any) =>
          bus.type === "route2" &&
          getTimeOnDate(time, bus.time).getTime() > time.getTime(),
      )) {
        if (returnData.some((bus) => bus.line === "route2")) continue;
        if (bus.description == "週五停駛" && time.getDay() === 5) continue;
        const notes = [];
        if (bus.description.includes("83號"))
          notes.push(language == "zh" ? "83號" : "Bus 83");
        returnData.push({
          tab: "nanda",
          Icon: Route2LineIcon,
          startTime: bus.time,
          line: "route2",
          direction: "down",
          title: dict.bus.route2_line,
          destination: language == "zh" ? "往校本部" : "To Main Campus",
          notes,
          arrival: bus.time,
        });
      }
    }

    // filler for no service busses
    if (!returnData.some((bus) => bus.line === "red") && tab != "nanda") {
      returnData.push({
        tab: "north_gate",
        Icon: RedLineIcon,
        startTime: "0:00",
        line: "red",
        direction: "up",
        title: dict.bus.red_line,
        arrival: dict.bus.service_over,
      });
    }
    if (!returnData.some((bus) => bus.line === "green") && tab != "nanda") {
      returnData.push({
        tab: "north_gate",
        Icon: GreenLineIcon,
        startTime: "0:00",
        line: "green",
        direction: "up",
        title: dict.bus.green_line,
        arrival: dict.bus.service_over,
      });
    }
    if (!returnData.some((bus) => bus.line === "route1")) {
      returnData.push({
        tab: "north_gate",
        Icon: Route1LineIcon,
        startTime: "0:00",
        line: "route1",
        direction: "up",
        title: dict.bus.route1_line,
        arrival: dict.bus.service_over,
      });
    }
    if (!returnData.some((bus) => bus.line === "route2") && tab != "tsmc") {
      returnData.push({
        tab: "north_gate",
        Icon: Route2LineIcon,
        startTime: "0:00",
        line: "route2",
        direction: "up",
        title: dict.bus.route2_line,
        arrival: dict.bus.service_over,
      });
    }

    return returnData;
  }, [tab, busData, weektype, dict, time, language]);

  const handleTabChange = (tab: string) => {
    setTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  const busPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "校車時刻表 | NTHUMods",
    description:
      "查看清華大學校車即時時刻表，包含校園巴士、南大區間車等路線資訊",
    url: `https://nthumods.com/${language}/bus`,
    inLanguage: language === "en" ? "en-US" : "zh-TW",
    isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
  };

  const seoHelmet = (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(busPageJsonLd)}
      </script>
    </Helmet>
  );

  if (isCampusLoading) {
    return (
      <>
        {seoHelmet}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500"></div>
        </div>
      </>
    );
  }

  if (campusError) {
    return (
      <>
        {seoHelmet}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-red-500">{dict.bus.load_error}</div>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col px-4">
      {seoHelmet}
      {pins.length > 0 && (
        <section className="mb-4 flex flex-col">
          <h2 className="px-2 font-bold">{dict.bus.my_buses}</h2>
          <div className="flex flex-col px-2 divide-y divide-border">
            {selectedCampusBuses.map((bus, index) => (
              <BusListingItem
                key={`${bus.line}:${bus.direction}:${index}`}
                {...bus}
                refTime={time}
              />
            ))}
            <CityBusSelectedLines refTime={time} />
          </div>
        </section>
      )}
      <Tabs
        defaultValue="north_gate"
        value={tab}
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full justify-start overflow-x-auto mb-4">
          <TabsTrigger className="flex-1 shrink-0" value="north_gate">
            {dict.bus.north_gate}
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="tsmc">
            {dict.bus.tsmc}
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="nanda">
            {dict.bus.nanda}
          </TabsTrigger>
          <TabsTrigger className="flex-1 shrink-0" value="city">
            {dict.bus.add_line}
          </TabsTrigger>
        </TabsList>
        {tab === "city" ? (
          <CityBusCatalogue />
        ) : (
          <div className="flex flex-col px-2 divide-y divide-border">
            {displayBuses.map((bus, index) => (
              <BusListingItem key={index} {...bus} refTime={time} />
            ))}
          </div>
        )}
      </Tabs>
      <div className="h-6"></div>
      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default BusPage;
