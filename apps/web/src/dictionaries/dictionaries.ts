const dictionaries = {
  en: () => import("./en.json").then((module) => module.default),
  zh: () => import("./zh.json").then((module) => module.default),
  "zh-cn": () => import("./zh-hans.json").then((module) => module.default),
};

export const getDictionary = async (locale: "en" | "zh" | "zh-cn") =>
  dictionaries[locale]();
