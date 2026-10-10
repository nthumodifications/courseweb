import { expect, test } from "bun:test";
import { fullWidthToHalfWidth } from "./characters";

test("converts full-width ASCII letters and digits without changing other text", () => {
  expect(fullWidthToHalfWidth("１２３ ＡＢＣ ａｂｃ 清大！")).toBe(
    "123 ABC abc 清大！",
  );
});
