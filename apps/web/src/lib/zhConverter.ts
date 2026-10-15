import {
  createAuthoredTextConverter,
  type TextConverter,
} from "./zhConversionConfig";

export type ZhConverters = {
  authored: TextConverter;
  characters: TextConverter;
};

let convertersPromise: Promise<ZhConverters> | null = null;
let convertersValue: ZhConverters | null = null;

export const loadZhConverters = (): Promise<ZhConverters> => {
  if (!convertersPromise) {
    convertersPromise = import("./zhOpencc").then(({ default: OpenCC }) => {
      const phraseConverter = OpenCC.Converter({ from: "twp", to: "cn" });
      const characterConverter = OpenCC.Converter({ from: "tw", to: "cn" });
      const converters = {
        authored: createAuthoredTextConverter(
          phraseConverter,
          characterConverter,
        ),
        characters: characterConverter,
      };
      convertersValue = converters;
      return converters;
    });
  }
  return convertersPromise;
};

export const getZhConverters = () =>
  // This deliberately stays synchronous for render paths. LangLayout has
  // already suspended until this promise resolves for zh-cn.
  convertersValue;
