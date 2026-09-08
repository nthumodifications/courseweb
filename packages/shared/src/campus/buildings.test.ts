import { describe, expect, test } from "bun:test";
import {
  findCampusIdentityForOsmFeature,
  normalizeCampusSearch,
  resolveVenueToCampusIdentity,
  searchCampusBuildingIdentities,
} from "./buildings";

describe("campus building identity", () => {
  test.each(["台達", "台達館", "DELTA", "DELTA台達629"])(
    "resolves %s to Delta Building",
    (query) => {
      expect(resolveVenueToCampusIdentity(query)?.id).toBe("delta");
      expect(searchCampusBuildingIdentities(query)[0]?.id).toBe("delta");
    },
  );

  test("uses the existing CourseWeb venue parser for full room names", () => {
    expect(resolveVenueToCampusIdentity("EECS資電101")?.id).toBe("eecs");
    expect(resolveVenueToCampusIdentity("MXIC旺宏B1")?.id).toBe("mxic");
  });

  test("normalizes punctuation, width, case, and spaces", () => {
    expect(normalizeCampusSearch("  Delta-Hall（NTHU） ")).toBe(
      "deltahallnthu",
    );
  });

  test("maps stable OSM identities without relying on display names", () => {
    expect(findCampusIdentityForOsmFeature("relation", 3815072, [])?.id).toBe(
      "delta",
    );
  });

  test("does not guess unknown venues", () => {
    expect(resolveVenueToCampusIdentity("UNKNOWN999")).toBeUndefined();
    expect(searchCampusBuildingIdentities("UNKNOWN999")).toEqual([]);
  });
});
