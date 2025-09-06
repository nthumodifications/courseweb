import { useParams } from "next/navigation";
import en from "./en.json";
import zh from "./zh.json";

const useDictionary = () => {
  const { lang } = useParams();

  return lang == "en" ? en : zh;
};

export default useDictionary;
