import { describe, expect, test } from "bun:test";
import {
  filterDirectoryUnits,
  getDirectoryTelHref,
  splitDirectoryExtensions,
} from "./directory-core";
import type { DirectoryUnit } from "./directory";

const units: DirectoryUnit[] = [
  {
    id: "01",
    name: "校長室",
    parentName: null,
    url: null,
    phone: "03-5162001",
    extension: "62001",
    email: "presid@my.nthu.edu.tw",
    website: null,
  },
  {
    id: "02",
    name: "圖書館",
    parentName: "行政單位",
    url: null,
    phone: null,
    extension: null,
    email: null,
    website: null,
  },
];

describe("directory helpers", () => {
  test("matches unit and parent names, including localized text", () => {
    expect(filterDirectoryUnits(units, "行政")).toEqual([units[1]]);
    expect(
      filterDirectoryUnits(units, "library", (value) =>
        value === "圖書館" ? "Library" : value,
      ),
    ).toEqual([units[1]]);
  });

  test("builds phone links with extensions", () => {
    const extensions = splitDirectoryExtensions("62001、62002, 62003/62004");
    expect(extensions).toEqual(["62001", "62002", "62003", "62004"]);
    expect(
      extensions.map((extension) =>
        getDirectoryTelHref("03-516 2001", extension),
      ),
    ).toEqual([
      "tel:035162001;ext=62001",
      "tel:035162001;ext=62002",
      "tel:035162001;ext=62003",
      "tel:035162001;ext=62004",
    ]);
    expect(getDirectoryTelHref("03-516 2001", null)).toBe("tel:035162001");
    expect(getDirectoryTelHref(null, "62001")).toBeNull();
  });
});
