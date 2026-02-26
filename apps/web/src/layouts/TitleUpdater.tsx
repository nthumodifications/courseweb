import { useEffect } from "react";
import { useMatches } from "react-router-dom";

interface RouteHandle {
  title?: string;
}

const TitleUpdater = () => {
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as RouteHandle | undefined;
  const title = handle?.title;

  useEffect(() => {
    document.title = title ? `${title} | NTHUMods` : "NTHUMods";
  }, [title]);

  return null;
};

export default TitleUpdater;
