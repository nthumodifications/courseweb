import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";
import { parsePrerequisites } from "@courseweb/shared";
import PrerequisiteBlock from "./PrerequisiteBlock";

const examples = [
  "擋修對象 : 全校\n先修科目 : 中級日語二-成績需C-以上高級日語二-成績需C-以上高級日語一-成績需C-以上日語會話二-成績需C-以上曾修日本語能力試驗N3級通過上述條件任選一科，則不擋修。",
  "擋修對象 : 全校\n先修科目 : 曾修計算機概論二曾修程式語言曾修資訊系統應用曾修Ｃ語言曾修計算機概論上述條件任選一科，而且曾修工程數學曾修應用數學曾修工程數學一曾修應用數學一上述條件任選一科，則不擋修。",
  "擋修對象 : 全校\n先修科目 : 未修過現代社會與心理未修過心理學與現代生活未修過普通心理學未修過心理學未修過心理學(基本科目免修測試)未修過普通心理學一未修過普通心理學二上述條件一定要有，則不擋修。",
  "擋修對象 : 全校\n先修科目 : 大學中文-成績需C-以上基礎寫作-成績需C-以上上述條件任選一科，則不擋修。",
  "擋修對象 : 全校\n先修科目 : CEFR A1通過-成績需C-以上中級法語一-成績需C-以上上述條件任選一科，則不擋修。",
];

const renderedText = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const course = {
  raw_id: "11510EX  000000",
  semester: "11510",
  department: "EX",
  course: "000000",
  name_zh: "範例課程",
  name_en: "Example course",
};

const expectedAriaLabels = {
  en: [
    "Requires any one of 中級日語二 (C- or above), 高級日語二 (C- or above), 高級日語一 (C- or above), 日語會話二 (C- or above), 日本語能力試驗N3級通過.",
    "Requires any one of 計算機概論二, 程式語言, 資訊系統應用, C語言, 計算機概論; and any one of 工程數學, 應用數學, 工程數學一, 應用數學一.",
    "Requires not having taken 現代社會與心理, 心理學與現代生活, 普通心理學, 心理學, 心理學(基本科目免修測試), 普通心理學一, 普通心理學二.",
    "Requires any one of 大學中文 (C- or above), 基礎寫作 (C- or above).",
    "Requires any one of CEFR A1通過 (C- or above), 中級法語一 (C- or above).",
  ],
  zh: [
    "需要任一 中級日語二 (C- 以上)、高級日語二 (C- 以上)、高級日語一 (C- 以上)、日語會話二 (C- 以上)、日本語能力試驗N3級通過。",
    "需要任一 計算機概論二、程式語言、資訊系統應用、C語言、計算機概論；且任一 工程數學、應用數學、工程數學一、應用數學一。",
    "需要未修過 現代社會與心理、心理學與現代生活、普通心理學、心理學、心理學(基本科目免修測試)、普通心理學一、普通心理學二。",
    "需要任一 大學中文 (C- 以上)、基礎寫作 (C- 以上)。",
    "需要任一 CEFR A1通過 (C- 以上)、中級法語一 (C- 以上)。",
  ],
} as const;

describe("PrerequisiteBlock server rendering", () => {
  test("renders the five corrected examples in both languages", () => {
    for (const [language, dict] of [
      ["en", en],
      ["zh", zh],
    ] as const) {
      examples.forEach((text, index) => {
        const parsed = parsePrerequisites(text);
        expect(parsed.coverage).toBe("full");
        const markup = renderToStaticMarkup(
          <StaticRouter location={`/${language}/courses/example`}>
            <PrerequisiteBlock
              parsed={parsed}
              course={course}
              rows={[]}
              lang={language}
              dict={dict}
            />
          </StaticRouter>,
        );
        const textOutput = renderedText(markup);
        expect(textOutput).toContain(
          language === "en" ? "Applies to: all students" : "適用對象：全校學生",
        );
        if (index === 1) {
          expect(textOutput).toContain(language === "en" ? "and" : "而且");
        }
        expect(markup.match(/aria-label="([^"]+)"/)?.[1]).toBe(
          expectedAriaLabels[language][index],
        );
      });
    }
  });
});
