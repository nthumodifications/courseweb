import { describe, expect, test } from "bun:test";

import { serializeJsonLd } from "./seo";

describe("JSON-LD serialization", () => {
  test.each(["</script>", "<img src=x>", "A & B"])(
    "keeps %s inside a valid JSON script value",
    (value) => {
      const serialized = serializeJsonLd({ value });

      expect(serialized).not.toContain("</script>");
      expect(JSON.parse(serialized)).toEqual({ value });
    },
  );
});
