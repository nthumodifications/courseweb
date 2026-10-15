import { ConverterBuilder } from "opencc-js/core";
import fromTw from "opencc-js/from/tw";
import fromTwp from "opencc-js/from/twp";
import tsCharacters from "opencc-js/dict/TSCharacters";
import tsPhrases from "opencc-js/dict/TSPhrases";
import twPhrasesRev from "opencc-js/dict/TWPhrasesRev";
import twVariantsRev from "opencc-js/dict/TWVariantsRev";
import twVariantsRevPhrases from "opencc-js/dict/TWVariantsRevPhrases";
import toCn from "opencc-js/to/cn";

const OpenCC = ConverterBuilder({
  from: { tw: fromTw, twp: fromTwp },
  to: { cn: toCn },
  configs: {
    tw2s: {
      segmentation: [],
      conversionChain: [
        [twVariantsRevPhrases, twVariantsRev],
        [tsPhrases, tsCharacters],
      ],
    },
    tw2sp: {
      segmentation: [tsPhrases],
      conversionChain: [
        [twPhrasesRev, twVariantsRevPhrases, twVariantsRev],
        [tsPhrases, tsCharacters],
      ],
    },
  },
});

export const Converter = OpenCC;
export default { Converter };
