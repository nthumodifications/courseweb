import { useSettings } from "@/hooks/contexts/settings";
import { Tabs, TabsList, TabsTrigger } from "@courseweb/ui";
import { FC, SVGProps, useEffect, useMemo, useState } from "react";
import useTime from "@/hooks/useTime";
import { useQuery } from "@tanstack/react-query";
import { getAllBusData, CompleteBusData } from "@/libs/bus";
import {
  addMinutes,
  differenceInMinutes,
  format,
  isWeekend,
  set,
} from "date-fns";
import { cn } from "@courseweb/ui";
import { ChevronRight, Timer } from "lucide-react";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { Route1LineIcon } from "@/components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "@/components/BusIcons/Route2LineIcon";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTimeOnDate } from "@/helpers/bus";
import useDictionary from "@/dictionaries/useDictionary";
import OpenCollectiveSponsorBanner from "@/components/Sponsorship/OpenCollectiveSponsorBanner";

type BusListingItemProps = {
  tab: string;
  startTime: string;
  refTime: Date;
  Icon: FC<SVGProps<SVGSVGElement>>;
  line: string;
  direction: string;
  title: string;
  destination?: string;
  notes?: string[];
  arrival: string;
};
const BusListingItem = ({
  tab,
  startTime,
  refTime,
  Icon,
  line,
  title,
  destination,
  direction,
  notes = [],
  arrival,
}: BusListingItemProps) => {
  const { language } = useSettings();
  const dict = useDictionary();

  const displayTime = useMemo(() => {
    // check if is time, else return as is
    if (!arrival.match(/\d{2}:\d{2}/)) return arrival;
    const time_arr = set(new Date(), {
      hours: parseInt(arrival.split(":")[0]),
      minutes: parseInt(arrival.split(":")[1]),
    });
    // if now - time < 1 minutes, display "即將發車"
    if (time_arr.getTime() < refTime.getTime()) {
      return dict.bus.departed;
    } else if (time_arr.getTime() - refTime.getTime() < 2 * 60 * 1000) {
      return dict.bus.departing;
    }
    // within 5 minutes, display relative time
    else if (time_arr.getTime() - refTime.getTime() < 5 * 60 * 1000) {
      return `${differenceInMinutes(time_arr, refTime)} min`;
    }
    return arrival;
  }, [arrival, refTime, dict]);

  const navigate = useNavigate();
  const route =
    line == "nanda" || line == "route1" || line == "route2" ? "nanda" : "main";

  // index should start at 0 if is green/up and red/up, but when is down , green/down should start at 5 and red/down at 4
  // if is nanda, both dir index should start at 0
  const index =
    direction == "up" ? 0 : line == "green" ? 5 : line == "red" ? 4 : 0;

  const handleItemClick = () => {
    navigate(
      `/${language}/bus/${route}/${line == "nanda" || line == "route1" || line == "route2" ? `${line}_${direction}` : line}?return_url=/${language}/bus?tab=${tab}`,
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 py-4",
        arrival == dict.bus.service_over ? "opacity-30" : "",
      )}
    >
      <div
        className={cn("flex flex-row items-center gap-4 cursor-pointer")}
        onClick={handleItemClick}
      >
        <Icon className="h-7 w-7" />
        <div className="flex flex-row flex-wrap gap-2">
          <h3 className="text-slate-800 dark:text-neutral-100 font-bold">
            <span>{title}</span>
            {destination && <span>-{destination}</span>}
          </h3>
        </div>
        <div
          className={cn(
            "flex-1 text-right text-slate-800 dark:text-neutral-200 font-bold whitespace-nowrap",
            displayTime == dict.bus.departing ? "text-nthu-500" : "",
          )}
        >
          {displayTime}
        </div>
        <div className="grid place-items-center">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
      <div className="flex flex-row gap-2">
        <div
          className="justify-center items-center gap-2 inline-flex cursor-pointer"
          onClick={() => navigate(`/${language}/bus/${route}`)}
        >
          <Timer className="w-4 h-4" />
          <div className="text-center text-sm font-medium">
            {dict.bus.schedule}
          </div>
        </div>
        {notes.map((note) => (
          <div
            className="justify-center items-center gap-2 inline-flex"
            key={note}
          >
            <div className="text-center text-sm font-medium">・{note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BusPage = () => {
  const { language } = useSettings();
  const time = useTime();
  const dict = useDictionary();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("north_gate");
  const navigate = useNavigate();

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
  });

  const displayBuses = useMemo(() => {
    if (!busData) return [];

    const returnData: (Omit<BusListingItemProps, "refTime"> & {
      line: "red" | "green" | "nanda" | "route1" | "route2" | "tld";
    })[] = [];

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nthu-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-red-500">
          Failed to load bus data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4">
      <Tabs
        defaultValue="north_gate"
        value={tab}
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full justify-evenly mb-4">
          <TabsTrigger className="flex-1" value="north_gate">
            {dict.bus.north_gate}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="tsmc">
            {dict.bus.tsmc}
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="nanda">
            {dict.bus.nanda}
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-col px-2 divide-y divide-slate-100 dark:divide-neutral-700">
          {displayBuses.map((bus, index) => (
            <BusListingItem key={index} {...bus} refTime={time} />
          ))}
        </div>
      </Tabs>
      <div className="h-6"></div>
      <OpenCollectiveSponsorBanner />
    </div>
  );
};

export default BusPage;
