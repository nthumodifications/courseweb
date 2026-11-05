import { describe, expect, test } from "bun:test";
import type { ClassPageMember } from "@/lib/class-pages";
import {
  filterAndSortClassmates,
  getClassmateInitial,
  getLinkHost,
  getMemberPrivacyHint,
} from "./classmatesLogic";

const members: ClassPageMember[] = [
  {
    id: "a",
    displayName: "Zoe",
    department: "CS",
    year: "2",
    contacts: [],
    lookingForPartners: false,
    selfDeclared: true,
  },
  {
    id: "b",
    displayName: "Ada",
    department: "EE",
    year: "3",
    contacts: [],
    lookingForPartners: true,
    selfDeclared: true,
  },
  {
    id: "c",
    displayName: null,
    department: "CS",
    year: "4",
    contacts: [],
    lookingForPartners: true,
    selfDeclared: true,
  },
];

describe("classmate list logic", () => {
  test("filters by name, department, year, partner status, and department", () => {
    expect(
      filterAndSortClassmates(members, {
        query: "ad",
        hiddenName: "Classmate",
      }).map((member) => member.id),
    ).toEqual(["b"]);
    expect(
      filterAndSortClassmates(members, {
        query: "3",
        partnersOnly: true,
        hiddenName: "Classmate",
      }).map((member) => member.id),
    ).toEqual(["b"]);
    expect(
      filterAndSortClassmates(members, {
        department: "CS",
        hiddenName: "Classmate",
      }).map((member) => member.id),
    ).toEqual(["c", "a"]);
  });

  test("sorts partner seekers first, then by the visible name", () => {
    expect(
      filterAndSortClassmates(members, { hiddenName: "Classmate" }).map(
        (member) => member.id,
      ),
    ).toEqual(["b", "c", "a"]);
  });

  test("uses a fallback initial and extracts the shared-link host", () => {
    expect(getClassmateInitial(null, "Classmate")).toBe("C");
    expect(getClassmateInitial(" Ada ", "Classmate")).toBe("A");
    expect(getLinkHost("https://example.com/path")).toBe("example.com");
  });

  test("shows a privacy hint when reciprocity locks fields or a member hides details", () => {
    expect(
      getMemberPrivacyHint(members[0], ["contacts"], "Private details"),
    ).toBe("Private details");
    expect(getMemberPrivacyHint(members[0], [], "Private details")).toBe(
      "Private details",
    );
    const complete = {
      ...members[0],
      displayName: "Ada",
      department: "CS",
      year: "2",
      contacts: [{ label: "Site", value: "https://example.com" }],
    };
    expect(getMemberPrivacyHint(complete, [], "Private details")).toBeNull();
  });
});
