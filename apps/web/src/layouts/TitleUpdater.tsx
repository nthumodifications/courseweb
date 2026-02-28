import { useEffect } from "react";
import { useMatches } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";

interface RouteHandle {
  title?: string;
  titleZh?: string;
}

const TitleUpdater = () => {
  const matches = useMatches();
  const { language } = useSettings();
  const handle = matches.at(-1)?.handle as RouteHandle | undefined;
  const title =
    language === "zh" && handle?.titleZh ? handle.titleZh : handle?.title;

  useEffect(() => {
    document.title = title ? `${title} | NTHUMods` : "NTHUMods";
  }, [title]);

  return null;
};

export default TitleUpdater;
