import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dictionaryDir = path.join(repoRoot, "apps", "web", "src", "dictionaries");
const files = ["zh.json", "en.json"].map((name) => path.join(dictionaryDir, name));

const flattenKeys = (value, prefix = "") => {
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object") {
      return flattenKeys(child, fullKey);
    }
    return [fullKey];
  });
};

const dictionaries = files.map((file) => ({
  file,
  value: JSON.parse(fs.readFileSync(file, "utf8")),
}));
const [first, second] = dictionaries.map(({ value }) => new Set(flattenKeys(value)));
const onlyInFirst = [...first].filter((key) => !second.has(key)).sort();
const onlyInSecond = [...second].filter((key) => !first.has(key)).sort();

if (onlyInFirst.length || onlyInSecond.length) {
  if (onlyInFirst.length) console.error(`Only in zh.json:\n${onlyInFirst.join("\n")}`);
  if (onlyInSecond.length) console.error(`Only in en.json:\n${onlyInSecond.join("\n")}`);
  process.exit(1);
}

console.log(`Dictionary key trees match (${first.size} keys).`);
