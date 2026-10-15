import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import OpenCC from "opencc-js/t2cn";
import {
  createAuthoredTextConverter,
  POST_PHRASE_OVERRIDES,
  PROTECTED_PHRASES,
} from "../src/lib/zhConversionConfig.ts";

export { POST_PHRASE_OVERRIDES, PROTECTED_PHRASES };

const convertString = createAuthoredTextConverter(
  OpenCC.Converter({ from: "twp", to: "cn" }),
  OpenCC.Converter({ from: "tw", to: "cn" }),
);

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
