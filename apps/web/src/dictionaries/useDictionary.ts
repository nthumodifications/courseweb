import { useParams } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import { useCachedDictionary } from "./dictionary-cache";

const useDictionary = () => {
  const { lang } = useParams();
  const { zhScript } = useSettings();
  return useCachedDictionary(lang, zhScript);
};

export default useDictionary;
