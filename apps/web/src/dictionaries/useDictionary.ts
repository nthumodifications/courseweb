import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import en from "./en.json";
import zh from "./zh.json";

const useDictionary = () => {
  const { lang } = useParams();
  const { zhScript } = useSettings();
  const [zhHans, setZhHans] = useState<typeof zh | null>(null);
  const [loadedScript, setLoadedScript] = useState<"hant" | "hans">("hant");

  useEffect(() => {
    if (lang !== "zh" || zhScript !== "hans") {
      setLoadedScript("hant");
      return;
    }

    let cancelled = false;
    setLoadedScript("hant");
    import("./zh-hans.json").then(({ default: dictionary }) => {
      if (!cancelled) {
        setZhHans(dictionary);
        setLoadedScript("hans");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lang, zhScript]);

  if (lang == "en") return en;
  return zhScript === "hans" && loadedScript === "hans" && zhHans ? zhHans : zh;
};

export default useDictionary;
