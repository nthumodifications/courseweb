import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { getZhConverters } from "@/lib/zhConverter";

type Localizer = (value: string) => string;

const identity: Localizer = (value) => value;

const useLocaleConverter = (kind: "authored" | "characters"): Localizer => {
  const { lang } = useParams<{ lang: string }>();
  const converter = getZhConverters()?.[kind];
  return useCallback(
    (value: string) =>
      lang === "zh-cn" ? (converter?.(value) ?? value) : value,
    [converter, lang],
  );
};

export const useLocalizedZhQuery = (): Localizer => {
  const { lang } = useParams<{ lang: string }>();
  const converter = getZhConverters()?.characters;
  return useCallback(
    (value: string) =>
      lang === "zh-cn" ? (converter?.(value) ?? value) : value,
    [converter, lang],
  );
};

export const useLocalizedZh = () => useLocaleConverter("authored");
export const useLocalizedZhData = () => useLocaleConverter("characters");

export const localizeZhQuery = (
  query: string,
  lang: string | undefined,
  converter?: Localizer,
) => (lang === "zh-cn" ? (converter?.(query) ?? query) : query);

export { identity };
