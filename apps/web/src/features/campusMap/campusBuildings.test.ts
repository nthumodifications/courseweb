import { describe, expect, test } from "bun:test";
import {
  CAMPUS_BUILDING_IDENTITIES,
  getCampusBuildingIdentity,
} from "@courseweb/shared";
import { buildCampusBuildings } from "../../../scripts/gen-campus-buildings";

const committedManifest = await Bun.file(
  new URL("../../../public/data/campus-buildings.json", import.meta.url),
).json();

describe("campus building deep-link manifest", () => {
  test("matches the generated committed JSON", () => {
    expect(committedManifest).toEqual(buildCampusBuildings());
  });

  test("resolves every generated identity", () => {
    const generated = buildCampusBuildings();

    expect(generated.buildings).toHaveLength(CAMPUS_BUILDING_IDENTITIES.length);
    for (const building of generated.buildings) {
      expect(getCampusBuildingIdentity(building.id)?.id).toBe(building.id);
    }
  });
});
