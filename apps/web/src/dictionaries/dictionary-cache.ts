import { useEffect, useState } from "react";
import en from "./en.json";
import zh from "./zh.json";

let zhHansDictionary: typeof zh | null = null;
let zhHansPromise: Promise<typeof zh | null> | null = null;

export const getCachedZhHans = () => zhHansDictionary;

export const loadZhHans = () => {
  if (zhHansDictionary) return Promise.resolve(zhHansDictionary);
  if (!zhHansPromise) {
    zhHansPromise = import("./zh-hans.json")
      .then(({ default: dictionary }) => {
        zhHansDictionary = dictionary;
        return dictionary;
      })
      .catch((error: unknown) => {
        console.error("Failed to load Simplified Chinese dictionary", error);
        return null;
      });
  }
  return zhHansPromise;
};

export const getDictionary = (
  lang: string | undefined,
  zhScript: "hant" | "hans",
  simplifiedDictionary = zhHansDictionary,
) => {
  if (lang === "en") return en;
  return zhScript === "hans" && simplifiedDictionary
    ? simplifiedDictionary
    : zh;
};

export const useCachedDictionary = (
  lang: string | undefined,
  zhScript: "hant" | "hans",
) => {
  const [zhHans, setZhHans] = useState<typeof zh | null>(getCachedZhHans);
  const shouldUseZhHans = lang === "zh" && zhScript === "hans";

  useEffect(() => {
    if (!shouldUseZhHans || getCachedZhHans()) return;

    let cancelled = false;
    void loadZhHans().then((dictionary) => {
      if (!cancelled && dictionary) setZhHans(dictionary);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldUseZhHans]);

  return getDictionary(lang, zhScript, zhHans);
};
