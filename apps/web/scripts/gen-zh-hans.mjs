import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import OpenCC from "opencc-js";

const phraseConverter = OpenCC.Converter({ from: "twp", to: "tw" });
const characterConverter = OpenCC.Converter({ from: "tw", to: "cn" });

export const PROTECTED_PHRASES = [
  "國立清華大學",
  "校務資訊系統",
  "核心團隊",
  "簡報室",
  "詳細資料",
  "申請資料",
  "資訊島",
  "NTHUMods",
  "清華",
  "清大",
  "校車",
  "行程",
  "程序",
  "複製",
  "啟用",
  "登出",
  "離線",
  "查詢",
].sort((left, right) => right.length - left.length);

// Small site-specific Taiwan-to-mainland phrase fixes after OpenCC phrase
// conversion and before the shared character conversion. Keep additions
// limited to everyday wording that appears in zh.json and twp misses.
export const POST_PHRASE_OVERRIDES = {
  透過: "通過",
};

const protectPhrases = (value) => {
  const replacements = [];
  let protectedValue = value;

  PROTECTED_PHRASES.forEach((phrase, index) => {
    const token = `__NTHUMODS_PROTECTED_${index}__`;
    if (!protectedValue.includes(phrase)) return;
    protectedValue = protectedValue.split(phrase).join(token);
    replacements.push([token, characterConverter(phrase)]);
  });

  return [protectedValue, replacements];
};

const applyPostPhraseOverrides = (value) =>
  Object.entries(POST_PHRASE_OVERRIDES).reduce(
    (result, [taiwanPhrase, mainlandPhrase]) =>
      result.split(taiwanPhrase).join(mainlandPhrase),
    value,
  );

const convertString = (value) => {
  const [protectedValue, replacements] = protectPhrases(value);
  const phraseConverted = phraseConverter(protectedValue);
  const overridden = applyPostPhraseOverrides(phraseConverted);
  const converted = characterConverter(overridden);
  return replacements.reduce(
    (result, [token, phrase]) => result.split(token).join(phrase),
    converted,
  );
};

export const convertDictionary = (value) => {
  if (typeof value === "string") return convertString(value);
  if (Array.isArray(value)) return value.map(convertDictionary);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        convertDictionary(item),
      ]),
    );
  }
  return value;
};

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const dictionaryPath = resolve("src/dictionaries/zh.json");
  const outputPath = resolve("src/dictionaries/zh-hans.json");
  const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
  const converted = convertDictionary(dictionary);
  await writeFile(outputPath, `${JSON.stringify(converted, null, 2)}\n`);
  console.log(`Generated ${pathToFileURL(outputPath).pathname}`);
}
