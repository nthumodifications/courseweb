import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import * as ts from "typescript";
import { expect, test } from "bun:test";
import en from "./en.json";
import zh from "./zh.json";
import allowlist from "./cjk-literal-allowlist.json";
import baseline from "./cjk-literal-allowlist.baseline.json";

const sourceRoot = resolve(import.meta.dir, "..");
const intentionallyEmptyDictionaryValues = new Set([
  "course.details.prerequisite_aria_requires_separator",
]);

const hasCjk = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0x3400 && codePoint <= 0x9fff;
  });

const placeholders = (value: unknown) =>
  typeof value === "string"
    ? [...value.matchAll(/\{[^{}]+\}/g)].map(([token]) => token).sort()
    : [];

const valueAt = (dictionary: unknown, key: string) =>
  key.split(/[.[\]]/).reduce<unknown>((current, part) => {
    if (part === "") return current;
    return (current as Record<string, unknown>)[part];
  }, dictionary);

const flatten = (value: unknown, prefix = "", result: string[] = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flatten(item, `${prefix}[${index}]`, result),
    );
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      flatten(item, prefix ? `${prefix}.${key}` : key, result),
    );
  } else {
    result.push(prefix);
  }
  return result;
};

const collectTsxFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(file);
    return file.endsWith(".tsx") && !file.endsWith(".test.tsx") ? [file] : [];
  });

const collectCjkLiterals = () => {
  const literals: string[] = [];
  for (const file of collectTsxFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const relativeFile = relative(sourceRoot, file).replaceAll("\\", "/");
    const record = (text: string) => {
      if (hasCjk(text)) literals.push(`${relativeFile}|${text}`);
    };
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node)) record(node.text);
      if (ts.isJsxText(node)) record(node.getText(sourceFile).trim());
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return literals;
};

test("English and Traditional Chinese dictionaries stay structurally aligned", () => {
  expect(flatten(en).sort()).toEqual(flatten(zh).sort());
});

test("dictionaries contain no empty values", () => {
  for (const dictionary of [en, zh]) {
    for (const key of flatten(dictionary)) {
      const value = valueAt(dictionary, key);
      if (!intentionallyEmptyDictionaryValues.has(key)) {
        expect(value, key).not.toBe("");
      }
      expect(value, key).not.toBeNull();
      expect(value, key).not.toBeUndefined();
    }
  }
});

test("matching dictionary values keep placeholder tokens in parity", () => {
  for (const key of flatten(en)) {
    expect(placeholders(valueAt(en, key)), key).toEqual(
      placeholders(valueAt(zh, key)),
    );
  }
});

test("the Chinese prerequisite sentence separator stays empty", () => {
  expect(zh.course.details.prerequisite_aria_requires_separator).toBe("");
});

test("new CJK TSX literals require an explicit allowlist entry", () => {
  const allowed = new Set(
    Object.entries(allowlist).flatMap(([file, values]) =>
      values.map((value) => `${file}|${value}`),
    ),
  );
  expect(
    [...new Set(collectCjkLiterals())].filter((item) => !allowed.has(item)),
  ).toEqual([]);
});

test("the CJK allowlist can only shrink", () => {
  const baselineEntries = new Set(
    Object.entries(baseline).flatMap(([file, values]) =>
      values.map((value) => `${file}|${value}`),
    ),
  );
  const currentEntries = Object.entries(allowlist).flatMap(([file, values]) =>
    values.map((value) => `${file}|${value}`),
  );

  expect(currentEntries.filter((entry) => !baselineEntries.has(entry))).toEqual(
    [],
  );
});
