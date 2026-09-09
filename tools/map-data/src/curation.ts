import { readFile } from "node:fs/promises";
import type { CampusBuilding } from "../../../packages/shared/src/campus";

type CurationNames = {
  zh: string;
  en?: string;
};

export type CampusMapCuration = {
  excluded: string[];
  renamed: Record<string, CurationNames>;
  groups: Array<{
    id: string;
    sourceIds: string[];
    zh: string;
    en?: string;
  }>;
};

const SOURCE_ID_PATTERN = /^(way|relation)\/\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertSourceId(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || !SOURCE_ID_PATTERN.test(value)) {
    throw new Error(`${field} must use the format way/123 or relation/123`);
  }
}

function parseNames(value: unknown, field: string): CurationNames {
  if (!isRecord(value) || typeof value.zh !== "string" || !value.zh.trim()) {
    throw new Error(`${field}.zh must be a non-empty string`);
  }
  if (value.en !== undefined && typeof value.en !== "string") {
    throw new Error(`${field}.en must be a string when provided`);
  }
  return { zh: value.zh, ...(value.en ? { en: value.en } : {}) };
}

export function parseCampusMapCuration(value: unknown): CampusMapCuration {
  if (!isRecord(value))
    throw new Error("Campus map curation must be an object");
  if (!Array.isArray(value.excluded)) {
    throw new Error("Campus map curation excluded must be an array");
  }
  if (!isRecord(value.renamed)) {
    throw new Error("Campus map curation renamed must be an object");
  }
  if (!Array.isArray(value.groups)) {
    throw new Error("Campus map curation groups must be an array");
  }

  const excluded = value.excluded.map((sourceId, index) => {
    assertSourceId(sourceId, `excluded[${index}]`);
    return sourceId;
  });
  const renamed = Object.fromEntries(
    Object.entries(value.renamed).map(([sourceId, names]) => {
      assertSourceId(sourceId, `renamed key ${sourceId}`);
      return [sourceId, parseNames(names, `renamed.${sourceId}`)];
    }),
  );
  const groupIds = new Set<string>();
  const groupedSources = new Set<string>();
  const groups = value.groups.map((group, groupIndex) => {
    if (!isRecord(group) || typeof group.id !== "string" || !group.id.trim()) {
      throw new Error(`groups[${groupIndex}].id must be a non-empty string`);
    }
    if (groupIds.has(group.id)) {
      throw new Error(`Duplicate campus map group id: ${group.id}`);
    }
    groupIds.add(group.id);
    if (!Array.isArray(group.sourceIds) || group.sourceIds.length === 0) {
      throw new Error(`groups[${groupIndex}].sourceIds must not be empty`);
    }
    const sourceIds = group.sourceIds.map((sourceId, sourceIndex) => {
      assertSourceId(
        sourceId,
        `groups[${groupIndex}].sourceIds[${sourceIndex}]`,
      );
      if (groupedSources.has(sourceId)) {
        throw new Error(
          `Building source appears in multiple groups: ${sourceId}`,
        );
      }
      groupedSources.add(sourceId);
      return sourceId;
    });
    const names = parseNames(group, `groups[${groupIndex}]`);
    return { id: group.id, sourceIds, ...names };
  });

  return { excluded, renamed, groups };
}

export async function loadCampusMapCuration(
  path: string,
): Promise<CampusMapCuration> {
  return parseCampusMapCuration(JSON.parse(await readFile(path, "utf8")));
}

function buildingSourceId(building: CampusBuilding): string {
  return `${building.source.type}/${building.source.id}`;
}

export function applyCampusMapCuration(
  buildings: CampusBuilding[],
  curation: CampusMapCuration,
): CampusBuilding[] {
  const excluded = new Set(curation.excluded);
  const groupBySource = new Map(
    curation.groups.flatMap((group) =>
      group.sourceIds.map((sourceId) => [sourceId, group] as const),
    ),
  );

  return buildings
    .filter((building) => !excluded.has(buildingSourceId(building)))
    .map((building) => {
      const sourceId = buildingSourceId(building);
      const group = groupBySource.get(sourceId);
      const names = group ?? curation.renamed[sourceId];
      if (!group && !names) return building;
      return {
        ...building,
        ...(group ? { labelGroupId: `curation:${group.id}` } : {}),
        names: {
          zh: names.zh,
          ...(names.en ? { en: names.en } : {}),
        },
      };
    });
}
