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
              lang={language}
              courseCatalog={[]}
              plannedCourseIds={new Set()}
              dict={dict}
            />
          </StaticRouter>,
        );
        const textOutput = renderedText(markup);
        console.log(`SSR ${language} example ${index + 1}: ${textOutput}`);
        expect(textOutput).toContain(
          language === "en" ? "Applies to: all students" : "適用對象：全校學生",
        );
      });
    }
  });
});
