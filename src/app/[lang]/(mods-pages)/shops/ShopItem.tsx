import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ShopItemProps {
  shop: {
    image: string;
    name: string;
    area: string;
    phone?: string;
    schedule: { [key: string]: string };
    note?: string;
  };
  filter: {
    search: string;
    open: boolean;
    area: string;
  };
}

const checkOpen = (schedule: string) => {
  if (schedule == "24小時") {
    return [true, "營業中", "24小時營業"];
  }
  if (schedule == "") {
    return [false, "今日休息"];
  }
  if (schedule.includes("、")) {
    const days = [
      "sunday",
      "weekday",
      "weekday",
      "weekday",
      "weekday",
      "weekday",
      "saturday",
    ];
    const today = days[new Date().getDay()];
    if (today == "weekday") {
      const timeslot1 = schedule.match(
        /(?<=(週|周)一(~|至)(週|周)五:?)\d{1,2}:\d{1,2}:\d{1,2}:\d{1,2}(?=、)/,
      );
      if (timeslot1) {
        schedule = schedule.replace(/(\d{1,2}:\d{2}):(\d{1,2}:\d{2})/, "$1-$2");
      }

      const timeslot = schedule.match(
        /(?<=(週|周)一(~|至)(週|周)五:?)\d{1,2}:\d{1,2}-\d{1,2}:\d{1,2}(?=、)/,
      );
      if (!timeslot) {
        return [false, "無資訊"];
      }
      let [start, end] = timeslot[0].split("-");
      let startDate = new Date();
      startDate.setHours(
        parseInt(start.split(":")[0]),
        parseInt(start.split(":")[1]),
        0,
      );
      let endDate = new Date();
      endDate.setHours(
        parseInt(end.split(":")[0]),
        parseInt(end.split(":")[1]),
        0,
      );

      let now = new Date();
      if (
        now < startDate &&
        startDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [false, "即將開始", start + "開始營業"];
      }
      if (
        now > startDate &&
        now < endDate &&
        endDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [true, "即將休息", end + "後休息"];
      }
      if (now > startDate && now < endDate) {
        return [true, "營業中", end + "後休息"];
      }
      if (now > endDate) {
        return [false, "休息中"];
      }
      if (now < endDate) {
        return [false, "即將開始", start + "開始營業"];
      }
      return [false, "無資訊"];
    }
    if (today == "saturday") {
      const timeslot = schedule.match(
        /(?<=(週|周)六:?)\d{2}:\d{2}-\d{2}:\d{2}/,
      );
      if (!timeslot) {
        return [false, "無資訊"];
      }
      let [start, end] = timeslot[0].split("-");
      let startDate = new Date();
      startDate.setHours(
        parseInt(start.split(":")[0]),
        parseInt(start.split(":")[1]),
        0,
      );
      let endDate = new Date();
      endDate.setHours(
        parseInt(end.split(":")[0]),
        parseInt(end.split(":")[1]),
        0,
      );

      let now = new Date();
      if (
        now < startDate &&
        startDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [false, "即將開始", start + "開始營業"];
      }
      if (
        now > startDate &&
        now < endDate &&
        endDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [true, "即將休息", end + "後休息"];
      }
      if (now > startDate && now < endDate) {
        return [true, "營業中", end + "後休息"];
      }
      if (now > endDate) {
        return [false, "休息中"];
      }
      if (now < endDate) {
        return [false, "即將開始", start + "開始營業"];
      }
      return [false, "無資訊"];
    }
    if (today == "sunday") {
      const timeslot = schedule.match(
        /(?<=(週|周)日:?)\d{2}:\d{2}-\d{2}:\d{2}/,
      );
      if (!timeslot) {
        return [false, "無資訊"];
      }
      let [start, end] = timeslot[0].split("-");
      let startDate = new Date();
      startDate.setHours(
        parseInt(start.split(":")[0]),
        parseInt(start.split(":")[1]),
        0,
      );
      let endDate = new Date();
      endDate.setHours(
        parseInt(end.split(":")[0]),
        parseInt(end.split(":")[1]),
        0,
      );

      let now = new Date();
      if (
        now < startDate &&
        startDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [false, "即將開始", start + "開始營業"];
      }
      if (
        now > startDate &&
        now < endDate &&
        endDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [true, "即將休息", end + "後休息"];
      }
      if (now > startDate && now < endDate) {
        return [true, "營業中", end + "後休息"];
      }
      if (now > endDate) {
        return [false, "休息中"];
      }
      if (now < endDate) {
        return [false, "即將開始", start + "開始營業"];
      }
      return [false, "無資訊"];
    }
  }
  if (schedule.includes(",")) {
    let timeslots = schedule.split(",").map((slot) => slot.trim());
    for (let slot of timeslots) {
      let [start, end] = slot.split("-");
      let startDate = new Date();
      startDate.setHours(
        parseInt(start.split(":")[0]),
        parseInt(start.split(":")[1]),
        0,
      );
      let endDate = new Date();
      endDate.setHours(
        parseInt(end.split(":")[0]),
        parseInt(end.split(":")[1]),
        0,
      );

      let now = new Date();
      if (
        now < startDate &&
        startDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [false, "即將開始", start + "開始營業"];
      }
      if (
        now > startDate &&
        now < endDate &&
        endDate.valueOf() - now.valueOf() < 3600 * 1000
      ) {
        return [true, "即將休息", end + "後休息"];
      }
      if (now > startDate && now < endDate) {
        return [true, "營業中", end + "後休息"];
      }
      if (now > endDate) {
        continue;
      }
      if (now < endDate) {
        return [false, "即將開始", start + "開始營業"];
      }
      return [false, "無資訊"];
    }
  }
  if (schedule.includes("-")) {
    let [start, end] = schedule.split("-");
    let startDate = new Date();
    startDate.setHours(
      parseInt(start.split(":")[0]),
      parseInt(start.split(":")[1]),
      0,
    );
    let endDate = new Date();
    endDate.setHours(
      parseInt(end.split(":")[0]),
      parseInt(end.split(":")[1]),
      0,
    );

    let now = new Date();
    if (now < startDate && startDate.valueOf() - now.valueOf() < 3600 * 1000) {
      return [false, "即將開始", start + "開始營業"];
    }
    if (
      now > startDate &&
      now < endDate &&
      endDate.valueOf() - now.valueOf() < 3600 * 1000
    ) {
      return [true, "即將休息", end + "後休息"];
    }
    if (now > startDate && now < endDate) {
      return [true, "營業中", end + "後休息"];
    }
    if (now > endDate) {
      return [false, "休息中"];
    }
    if (now < endDate) {
      return [false, "即將開始", start + "開始營業"];
    }
    return [false, "無資訊"];
  }
  return [false, "無資訊"];
};

const ShopItem: React.FC<ShopItemProps> = ({ shop, filter }) => {
  const days = [
    "sunday",
    "weekday",
    "weekday",
    "weekday",
    "weekday",
    "weekday",
    "saturday",
  ];
  const today = days[new Date().getDay()];

  let [isOpen, status, message] = checkOpen(shop.schedule[today]);

  if (
    filter &&
    filter.search &&
    !shop.name.toLowerCase().includes(filter.search.toLowerCase())
  ) {
    return null;
  }

  if (filter && filter.open && !isOpen) {
    return null;
  }

  if (
    filter &&
    filter.area &&
    filter.area !== shop.area &&
    filter.area !== "anywhere"
  ) {
    return null;
  }

  return (
    <div className="flex gap-6">
      <div className="flex flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shop.image}
          alt={shop.name}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover"
        />
      </div>
      <div className="flex-1">
        <div className="flex flex-col">
          <span className="font-bold text-xl">{shop.name}</span>
          <div className="flex items-center gap-1">
            <MapPin size="14" />
            <span className="text-muted-foreground text-sm">{shop.area}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <div className="flex gap-2 flex-col sm:items-center sm:flex-row">
              <Badge
                className="w-max"
                variant={isOpen ? "default" : "destructive"}
              >
                {status}
              </Badge>
              <span className="text-muted-foreground text-sm">{message}</span>
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col">
          <div className="grid grid-cols-[1.5rem_auto]">
            <Phone size="14" className="self-center" />
            {shop.phone ? (
              shop.phone.split(",").map((phone, index) => (
                <span
                  key={index}
                  className={
                    "text-muted-foreground text-sm " +
                    (index ? "col-start-2" : "")
                  }
                >
                  {phone}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">無</span>
            )}
          </div>
          <div className="grid grid-cols-[1.5rem_auto]">
            <Clock size="14" className="self-center" />
            <span className="text-muted-foreground text-sm">
              {shop.schedule[today] || "今日休息"}
            </span>
          </div>
          {shop.note && (
            <div className="grid grid-cols-[1.5rem_auto]">
              <Info size="14" className="mt-[3px]" />
              <span className="text-muted-foreground text-sm">{shop.note}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopItem;
