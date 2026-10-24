import {
  CAMPUS_BUILDING_IDENTITIES,
  type CampusBuildingIdentity,
} from "@courseweb/shared";

export type CampusBuildingManifest = {
  version: 1;
  buildings: Array<{
    id: string;
    code: string;
    nameZh: string;
    nameEn: string;
    aliases: string[];
    url: string;
  }>;
};

export function buildCampusBuildings(
  identities: readonly CampusBuildingIdentity[] = CAMPUS_BUILDING_IDENTITIES,
): CampusBuildingManifest {
  return {
    version: 1,
    buildings: [...identities]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((identity) => ({
        id: identity.id,
        code: identity.venue.code,
        nameZh: identity.names.zh,
        nameEn: identity.names.en ?? identity.names.zh,
        aliases: [...identity.venue.aliases],
        url: `https://nthumods.com/zh/map?building=${encodeURIComponent(identity.id)}`,
      })),
  };
}

if (import.meta.main) {
  const output = new URL(
    "../public/data/campus-buildings.json",
    import.meta.url,
  );
  await Bun.write(
    output,
    `${JSON.stringify(buildCampusBuildings(), null, 2)}\n`,
  );
}
