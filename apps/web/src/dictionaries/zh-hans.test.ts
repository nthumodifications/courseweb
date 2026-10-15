import { expect, test } from "bun:test";
import en from "./en.json";
import zh from "./zh.json";
import zhHans from "./zh-hans.json";
import {
  convertDictionary,
  POST_PHRASE_OVERRIDES,
  PROTECTED_PHRASES,
} from "../../scripts/gen-zh-hans.mjs";

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

const stringValues = (
  value: unknown,
  prefix = "",
  result: Array<[string, string]> = [],
) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      stringValues(item, `${prefix}[${index}]`, result),
    );
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      stringValues(item, prefix ? `${prefix}.${key}` : key, result),
    );
  } else if (typeof value === "string") {
    result.push([prefix, value]);
  }
  return result;
};

const placeholders = (value: string) =>
  [...value.matchAll(/\{[^{}]+\}/g)].map(([token]) => token).sort();

const asciiCharacters = (value: string) =>
  [...value].filter((character) => character.codePointAt(0)! <= 0x7f);

test("committed Simplified Chinese dictionary is generated from zh.json", () => {
  expect(zhHans).toEqual(convertDictionary(zh));
});

test("phrase protections preserve course-site wording while simplifying characters", () => {
  expect(PROTECTED_PHRASES).toEqual(
    expect.arrayContaining([
      "NTHUMods",
      "清華",
      "清大",
      "國立清華大學",
      "校車",
      "校務資訊系統",
      "查詢",
    ]),
  );
  expect(
    convertDictionary({
      school: "國立清華大學（清華、清大）",
      product: "NTHUMods 校務資訊系統",
      terms: "校車、行程、程序、複製、啟用、登出、離線、詳細資料、申請資料",
      mainland: "搜尋設定",
    }),
  ).toEqual({
    school: "国立清华大学（清华、清大）",
    product: "NTHUMods 校务资讯系统",
    terms: "校车、行程、程序、复制、启用、登出、离线、详细资料、申请资料",
    mainland: "搜索设置",
  });
});

test("site-specific mainland phrase corrections run before character conversion", () => {
  expect(POST_PHRASE_OVERRIDES).toEqual({ 透過: "通過" });
  expect(
    convertDictionary({
      lookup: "課程查詢、查詢畢業學分、即時查詢座位",
      route: "透過校務資訊系統",
    }),
  ).toEqual({
    lookup: "课程查询、查询毕业学分、实时查询座位",
    route: "通过校务资讯系统",
  });
});

test("Simplified Chinese dictionary has the same key tree and placeholders", () => {
  expect(flatten(zhHans).sort()).toEqual(flatten(zh).sort());

  for (const [key, value] of stringValues(zh)) {
    const converted = stringValues(zhHans).find(
      ([candidate]) => candidate === key,
    );
    expect(converted?.[0], key).toBe(key);
    expect(placeholders(converted?.[1] ?? ""), key).toEqual(
      placeholders(value),
    );
    expect(asciiCharacters(converted?.[1] ?? ""), key).toEqual(
      asciiCharacters(value),
    );
  }
});

test("Simplified Chinese dictionary stays aligned with English dictionary", () => {
  expect(flatten(zhHans).sort()).toEqual(flatten(en).sort());
});
