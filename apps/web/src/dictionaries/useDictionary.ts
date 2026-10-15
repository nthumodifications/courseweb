import { useParams } from "react-router-dom";
import { useCachedDictionary } from "./dictionary-cache";

const useDictionary = () => {
  const { lang } = useParams();
  return useCachedDictionary(lang);
};

export default useDictionary;
