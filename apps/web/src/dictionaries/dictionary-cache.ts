import en from "./en.json";
import zh from "./zh.json";
import { getZhConverters, loadZhConverters } from "@/lib/zhConverter";

let zhHansDictionary: typeof zh | null = null;
let zhHansPromise: Promise<typeof zh | null> | null = null;
let zhHansLoadFailed = false;

export const getCachedZhHans = () => zhHansDictionary;

export const loadZhHans = () => {
  if (zhHansDictionary) return Promise.resolve(zhHansDictionary);
  if (zhHansLoadFailed) return Promise.resolve(null);
  if (!zhHansPromise) {
    zhHansPromise = import("./zh-hans.json")
      .then(({ default: dictionary }) => {
        zhHansDictionary = dictionary;
        return dictionary;
      })
      .catch((error: unknown) => {
        zhHansLoadFailed = true;
        console.error("Failed to load Simplified Chinese dictionary", error);
        return null;
      });
  }
  return zhHansPromise;
};

export const loadZhCnAssets = () =>
  Promise.all([loadZhHans(), loadZhConverters()]).then(
    ([dictionary]) => dictionary,
  );

export const getDictionary = (
  lang: string | undefined,
  simplifiedDictionary = zhHansDictionary,
) => {
  if (lang === "en") return en;
  return lang === "zh-cn" && simplifiedDictionary ? simplifiedDictionary : zh;
};

export const useCachedDictionary = (lang: string | undefined) => {
  if (
    lang === "zh-cn" &&
    (!zhHansDictionary || (!zhHansLoadFailed && !getZhConverters()))
  ) {
    throw loadZhCnAssets();
  }
  return getDictionary(lang);
};
