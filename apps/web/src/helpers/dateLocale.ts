import { Language } from "@/types/settings";
import { contentLanguage } from "./contentLanguage";
import { enUS, zhCN, zhTW } from "date-fns/locale";

export const getLocale = (lang: Language) => {
  const enLocale: { [x: string]: string } = {
    lastWeek: "'last' eeee 'at' p",
    yesterday: "'Yesterday'",
    today: "'Today'",
    tomorrow: "'Tomorrow'",
    nextWeek: "EEEE",
    other: "P",
  };

  const zhLocale: { [x: string]: string } = {
    lastWeek: "'上週' eeee ' ' p",
    yesterday: "'昨天'",
    today: "'今天'",
    tomorrow: "'明天'",
    nextWeek: "EEEE",
    other: "P",
  };

  return contentLanguage(lang) == "en"
    ? {
        ...enUS,
        formatRelative: (token: string) => enLocale[token],
      }
    : lang === "zh-cn"
      ? {
          ...zhCN,
          formatRelative: (token: string) => zhLocale[token],
        }
      : {
          ...zhTW,
          formatRelative: (token: string) => zhLocale[token],
        };
};
