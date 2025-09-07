import { set } from "date-fns";
import { BusDepartureDetails } from "@/app/[lang]/(mods-pages)/bus/[route]/page.actions";
import { Language } from "@/types/settings";

export const getTimeOnDate = (date: Date, time: string) => {
  const [hour, minute] = time.split(":").map((n) => parseInt(n));
  return set(date, { hours: hour, minutes: minute });
};

export const exportNotes = (bus: BusDepartureDetails, lang: Language) => {
  const notes = [];
  if (bus.route == "校園公車" && bus.description) notes.push(bus.description);
  if (bus.route == "校園公車" && bus.dep_stop === "綜二 ")
    notes.push(lang == "zh" ? "綜二發車" : "Dep. from GEN II");
  if (bus.route == "南大區間車" && bus.description.includes("83號"))
    notes.push(lang == "zh" ? "83號" : "Bus 83");
  if (bus.route == "南大區間車" && bus.description.includes("週五停駛"))
    notes.push(lang == "zh" ? "週五停駛" : "N/A on Fridays");
  return {
    ...bus,
    notes,
  };
};
