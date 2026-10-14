const dictionaries = {
  en: () => import("./en.json").then((module) => module.default),
  zh: () => import("./zh.json").then((module) => module.default),
  "zh-hans": () => import("./zh-hans.json").then((module) => module.default),
};

export const getDictionary = async (
  locale: "en" | "zh",
  zhScript: "hant" | "hans" = "hant",
) =>
  dictionaries[locale === "zh" && zhScript === "hans" ? "zh-hans" : locale]();
