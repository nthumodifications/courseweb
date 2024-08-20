"use client";
import { useSettings } from "@/hooks/contexts/settings";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FC, SVGProps, useEffect, useMemo, useState } from "react";
import useTime from "@/hooks/useTime";
import { useQuery } from "@tanstack/react-query";
import { getBusesSchedules } from "./page.actions";
import {
  addMinutes,
  differenceInMinutes,
  format,
  isWeekend,
  set,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight, Timer } from "lucide-react";
import { RedLineIcon } from "@/components/BusIcons/RedLineIcon";
import { GreenLineIcon } from "@/components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "@/components/BusIcons/NandaLineIcon";
import { useRouter, useSearchParams } from "next/navigation";
import { getTimeOnDate } from "@/helpers/bus";
import useDictionary from "@/dictionaries/useDictionary";

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

  const router = useRouter();
  const route = line == "nanda" ? "nanda" : "main";

  // index should start at 0 if is green/up and red/up, but when is down , green/down should start at 5 and red/down at 4
  // if is nanda, both dir index should start at 0
  const index =
    direction == "up" ? 0 : line == "green" ? 5 : line == "red" ? 4 : 0;

  const handleItemClick = () => {
    router.push(
      `/${language}/bus/${route}/${line == "nanda" ? `${line}_${direction}` : line}?return_url=/${language}/bus?tab=${tab}`,
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
          onClick={() => router.push(`/${language}/bus/${route}`)}
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
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("north_gate");
  const router = useRouter();

  useEffect(() => {
    if (searchParams.has("tab")) {
      setTab(searchParams.get("tab") as string);
    }
  }, [searchParams]);

  const weektype = isWeekend(time) ? "weekend" : "weekday";

  const { data: UphillBuses = [], error } = useQuery({
    queryKey: ["buses_up", weektype],
    queryFn: () => getBusesSchedules("all", weektype, "up"),
  });

  const { data: DownhillBuses = [], error: error2 } = useQuery({
    queryKey: ["buses_down", weektype],
    queryFn: () => getBusesSchedules("all", weektype, "down"),
  });

  const displayBuses = useMemo(() => {
    const returnData: (Omit<BusListingItemProps, "refTime"> & {
      line: "red" | "green" | "nanda" | "tld";
    })[] = [];
    if (tab === "north_gate") {
      for (const bus of UphillBuses.filter(
        (bus) =>
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
        } else if (bus.route === "南大區間車") {
          if (returnData.some((bus) => bus.line === "nanda")) continue;
          if (bus.description == "週五停駛" && time.getDay() === 5) continue;
          const notes = [];
          if (bus.description.includes("83號"))
            notes.push(language == "zh" ? "83號" : "Bus 83");
          returnData.push({
            tab: "north_gate",
            Icon: NandaLineIcon,
            startTime: bus.time,
            line: "nanda",
            direction: "up",
            title: dict.bus.nanda_line,
            destination: language == "zh" ? "往南大校區" : "To Nanda",
            notes,
            arrival: bus.time,
          });
        }
      }
    } else if (tab === "tsmc") {
      // SCHOOL BUS DOWNHILL FROM TSMC
      for (const bus of DownhillBuses.filter(
        (bus) => getTimeOnDate(time, bus.time).getTime() > time.getTime(),
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
      }
      // NANDA BUS UPHILL TO NANDA (filter busses that left 7 minutes ago, and new time is arrive time + 7 minutes)
      for (const bus of UphillBuses.filter(
        (bus) => bus.route === "南大區間車",
      ).filter(
        (bus) =>
          addMinutes(getTimeOnDate(time, bus.time).getTime(), 7).getTime() >
          time.getTime(),
      )) {
        if (bus.route === "南大區間車") {
          if (returnData.some((bus) => bus.line === "nanda")) continue;
          if (bus.description == "週五停駛" && time.getDay() === 5) continue;
          const notes = [];
          if (bus.description.includes("83號"))
            notes.push(language == "zh" ? "83號" : "Bus 83");
          returnData.push({
            tab: "tsmc",
            Icon: NandaLineIcon,
            startTime: bus.time,
            line: "nanda",
            direction: "up",
            title: dict.bus.nanda_line,
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
      for (const bus of DownhillBuses.filter(
        (bus) => getTimeOnDate(time, bus.time).getTime() > time.getTime(),
      ).filter((bus) => bus.route === "南大區間車")) {
        if (returnData.some((bus) => bus.line === "nanda")) continue;
        if (bus.description == "週五停駛" && time.getDay() === 5) continue;
        const notes = [];
        if (bus.description.includes("83號"))
          notes.push(language == "zh" ? "83號" : "Bus 83");
        returnData.push({
          tab: "nanda",
          Icon: NandaLineIcon,
          startTime: bus.time,
          line: "nanda",
          direction: "down",
          title: dict.bus.nanda_line,
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
    if (!returnData.some((bus) => bus.line === "nanda")) {
      returnData.push({
        tab: "north_gate",
        Icon: NandaLineIcon,
        startTime: "0:00",
        line: "nanda",
        direction: "up",
        title: dict.bus.nanda_line,
        arrival: dict.bus.service_over,
      });
    }

    return returnData;
  }, [tab, UphillBuses, DownhillBuses, dict, time, language]);

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.replace(`?tab=${tab}`);
  };

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
    </div>
  );
};

export default BusPage;
