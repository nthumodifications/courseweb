export type WeatherLanguage = "en" | "zh";

export const formatWeatherWeekday = (
  date: string,
  language: WeatherLanguage,
) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(parsedDate);
};
