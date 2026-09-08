import { buildings, getBuildingDefinition } from "../constants/venues";
import type {
  CampusBuilding,
  CampusBuildingIdentity,
  CampusMapData,
} from "./types";

type IdentityConfig = {
  id: string;
  code: string;
  aliases?: string[];
  osmElementIds?: string[];
};

const IDENTITY_CONFIGS: IdentityConfig[] = [
  {
    id: "bmes",
    code: "BMES",
    aliases: ["生醫工程與環境科學館"],
    osmElementIds: ["way/180607994"],
  },
  { id: "computer-center", code: "CC", aliases: ["計通中心"] },
  {
    id: "chemical-engineering",
    code: "CHE",
    osmElementIds: ["way/180370149"],
  },
  { id: "chemistry", code: "CHEM", osmElementIds: ["way/180522526"] },
  {
    id: "chemistry-ii",
    code: "CHEM II",
    aliases: ["動機化學實驗室", "化學二館"],
    osmElementIds: ["way/180522506"],
  },
  {
    id: "clinic-counseling",
    code: "Counsel",
    aliases: ["醫輔中心"],
    osmElementIds: ["way/180522507"],
  },
  {
    id: "delta",
    code: "DELTA",
    aliases: ["台達", "Delta Hall"],
    osmElementIds: ["relation/3815072"],
  },
  {
    id: "dorm-ren",
    code: "D-Ren",
    aliases: ["Dormitory Jen"],
    osmElementIds: ["way/180546703"],
  },
  {
    id: "dorm-shi",
    code: "D-Shi",
    aliases: ["Dormitory Shyr"],
    osmElementIds: ["way/180546708"],
  },
  { id: "education", code: "EDU", osmElementIds: ["way/180522520"] },
  {
    id: "eecs",
    code: "EECS",
    aliases: ["資電館", "EECS Building", "劉炯朗館", "C.L. Liu Building"],
    osmElementIds: ["way/180522501"],
  },
  {
    id: "engineering-i",
    code: "ENG I",
    aliases: ["Engineering Building I"],
    osmElementIds: ["way/180365526"],
  },
  { id: "ess", code: "ESS", osmElementIds: ["way/180607990"] },
  {
    id: "general-i",
    code: "GEN I",
    aliases: ["第一綜合大樓: 行政大樓"],
    osmElementIds: ["way/180522504"],
  },
  {
    id: "general-ii",
    code: "GEN II",
    osmElementIds: ["way/180522500"],
  },
  {
    id: "general-iii",
    code: "GEN III",
    osmElementIds: ["way/180522503"],
  },
  {
    id: "general-iv",
    code: "GEN IV",
    osmElementIds: ["way/180365525"],
  },
  { id: "hss", code: "HSS", osmElementIds: ["relation/3809408"] },
  {
    id: "life-science-i",
    code: "LS I",
    osmElementIds: ["way/180607993"],
  },
  {
    id: "life-science-ii",
    code: "LS II",
    osmElementIds: ["way/180607984"],
  },
  {
    id: "green-energy",
    code: "LTM",
    aliases: ["綠色低碳能源大樓", "李存敏館", "Green Energy Building"],
    osmElementIds: ["way/180607985"],
  },
  {
    id: "materials-science",
    code: "MS",
    aliases: ["材料科技館: 工程四館"],
    osmElementIds: ["way/180522524"],
  },
  {
    id: "materials-lab",
    code: "MSLAB",
    osmElementIds: ["way/180522516"],
  },
  {
    id: "mxic",
    code: "MXIC",
    aliases: ["學習資源中心", "Learning Resource Centre", "Main Library"],
    osmElementIds: ["way/180365523"],
  },
  {
    id: "nthu-lab",
    code: "NTHU Lab",
    osmElementIds: ["relation/19774346"],
  },
  { id: "physics", code: "PHYS", osmElementIds: ["way/180522523"] },
  { id: "physics-lab", code: "PHYSLAB", aliases: ["普物實驗館"] },
  {
    id: "student-union",
    code: "STC",
    aliases: ["蒙民偉樓"],
    osmElementIds: ["way/180522527"],
  },
  { id: "tsmc", code: "TSMC", osmElementIds: ["way/432044412"] },
];

function compactSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\s\-_/()（）:：.]/g, "");
}

function createIdentity(config: IdentityConfig): CampusBuildingIdentity {
  const definition = buildings.find(
    (candidate) => candidate.code.english === config.code,
  );

  if (!definition) {
    throw new Error(`Missing CourseWeb building definition for ${config.code}`);
  }

  return {
    id: config.id,
    names: {
      zh: definition.building.chinese,
      en: definition.building.english,
    },
    venue: {
      code: definition.code.english,
      prefix: definition.prefix,
      aliases: Array.from(
        new Set([
          definition.code.chinese,
          definition.code.english,
          definition.prefix,
          definition.building.chinese,
          definition.building.english,
          ...(config.aliases ?? []),
        ]),
      ),
    },
    osmElementIds: config.osmElementIds ?? [],
  };
}

export const CAMPUS_BUILDING_IDENTITIES = IDENTITY_CONFIGS.map(createIdentity);

export function normalizeCampusSearch(value: string): string {
  return compactSearchText(value);
}

export function getCampusBuildingIdentity(
  identityId: string,
): CampusBuildingIdentity | undefined {
  return CAMPUS_BUILDING_IDENTITIES.find(({ id }) => id === identityId);
}

export function resolveVenueToCampusIdentity(
  venue: string,
): CampusBuildingIdentity | undefined {
  const definition = getBuildingDefinition(venue);
  if (definition) {
    return CAMPUS_BUILDING_IDENTITIES.find(
      (identity) => identity.venue.code === definition.code.english,
    );
  }

  const query = compactSearchText(venue);
  if (!query) return undefined;

  return CAMPUS_BUILDING_IDENTITIES.find((identity) =>
    identity.venue.aliases.some((alias) => compactSearchText(alias) === query),
  );
}

export function searchCampusBuildingIdentities(
  queryValue: string,
  limit = 8,
): CampusBuildingIdentity[] {
  const query = compactSearchText(queryValue);
  if (!query) return [];

  return CAMPUS_BUILDING_IDENTITIES.map((identity) => {
    const aliases = identity.venue.aliases.map(compactSearchText);
    const exact = aliases.some((alias) => alias === query);
    const startsWith = aliases.some(
      (alias) => alias.startsWith(query) || query.startsWith(alias),
    );
    const includes = aliases.some(
      (alias) => alias.includes(query) || query.includes(alias),
    );
    return { identity, score: exact ? 3 : startsWith ? 2 : includes ? 1 : 0 };
  })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) => b.score - a.score || a.identity.id.localeCompare(b.identity.id),
    )
    .slice(0, limit)
    .map(({ identity }) => identity);
}

export function findCampusIdentityForOsmFeature(
  type: "way" | "relation",
  id: number,
  names: string[],
): CampusBuildingIdentity | undefined {
  const elementId = `${type}/${id}`;
  const explicit = CAMPUS_BUILDING_IDENTITIES.find((identity) =>
    identity.osmElementIds.includes(elementId),
  );
  if (explicit) return explicit;

  const normalizedNames = names.filter(Boolean).map(compactSearchText);
  return CAMPUS_BUILDING_IDENTITIES.find((identity) =>
    identity.venue.aliases
      .filter((alias) => compactSearchText(alias).length >= 2)
      .some((alias) => normalizedNames.includes(compactSearchText(alias))),
  );
}

export function findCampusBuildingForIdentity(
  data: CampusMapData,
  identityId: string,
): CampusBuilding | undefined {
  return data.buildings.find((building) => building.identityId === identityId);
}
