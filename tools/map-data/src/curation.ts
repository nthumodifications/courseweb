import { readFile, writeFile } from "node:fs/promises";
import type {
  CampusAreaFeature,
  CampusBuilding,
} from "../../../packages/shared/src/campus";

type CurationNames = {
  zh: string;
  en?: string;
};

export type CampusMapCuration = {
  labels: Array<{
    number: number;
    featureIds: string[];
    sourceIds: string[];
    name: string;
  }>;
  excluded: number[];
  renamed: Record<string, CurationNames>;
  groups: Array<{
    id: string;
    labelNumbers: number[];
    zh: string;
    en?: string;
  }>;
};

const SOURCE_ID_PATTERN = /^(way|relation)\/\d+$/;
const FEATURE_ID_PATTERN = /^osm-(way|relation)-\d+-\d+$/;
const CURATION_INSTRUCTIONS = {
  apply: "Run: bun run map:generate",
  syncLabels:
    "Run: bun run map:sync-labels only when OpenStreetMap adds new locations.",
  labels:
    "Stable # number to OSM source ID reference. Do not renumber entries.",
  excluded: "Add # numbers that should not appear on the map.",
  renamed: "Map a # number to a bilingual display name.",
  groups:
    "Give multiple building # numbers one shared label and bilingual name.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertPositiveInteger(
  value: unknown,
  field: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer label number`);
  }
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
  if (!Array.isArray(value.labels)) {
    throw new Error("Campus map curation labels must be an array");
  }
  if (!Array.isArray(value.excluded)) {
    throw new Error("Campus map curation excluded must be an array");
  }
  if (!isRecord(value.renamed)) {
    throw new Error("Campus map curation renamed must be an object");
  }
  if (!Array.isArray(value.groups)) {
    throw new Error("Campus map curation groups must be an array");
  }

  const labelNumbers = new Set<number>();
  const labeledFeatures = new Set<string>();
  const labels = value.labels.map((label, labelIndex) => {
    if (!isRecord(label))
      throw new Error(`labels[${labelIndex}] must be an object`);
    assertPositiveInteger(label.number, `labels[${labelIndex}].number`);
    if (labelNumbers.has(label.number)) {
      throw new Error(`Duplicate campus map label number: ${label.number}`);
    }
    labelNumbers.add(label.number);
    if (!Array.isArray(label.featureIds) || label.featureIds.length === 0) {
      throw new Error(`labels[${labelIndex}].featureIds must not be empty`);
    }
    const featureIds = label.featureIds.map((featureId, featureIndex) => {
      if (
        typeof featureId !== "string" ||
        !FEATURE_ID_PATTERN.test(featureId)
      ) {
        throw new Error(
          `labels[${labelIndex}].featureIds[${featureIndex}] must use the generated osm-way-123-0 format`,
        );
      }
      if (labeledFeatures.has(featureId)) {
        throw new Error(`Duplicate campus map feature ID: ${featureId}`);
      }
      labeledFeatures.add(featureId);
      return featureId;
    });
    if (!Array.isArray(label.sourceIds) || label.sourceIds.length === 0) {
      throw new Error(`labels[${labelIndex}].sourceIds must not be empty`);
    }
    const sourceIds = label.sourceIds.map((sourceId, sourceIndex) => {
      assertSourceId(
        sourceId,
        `labels[${labelIndex}].sourceIds[${sourceIndex}]`,
      );
      return sourceId;
    });
    if (typeof label.name !== "string") {
      throw new Error(`labels[${labelIndex}].name must be a string`);
    }
    return {
      number: label.number,
      featureIds,
      sourceIds,
      name: label.name,
    };
  });

  const excludedNumbers = new Set<number>();
  const excluded = value.excluded.map((number, index) => {
    assertPositiveInteger(number, `excluded[${index}]`);
    if (excludedNumbers.has(number)) {
      throw new Error(`Duplicate excluded label number: ${number}`);
    }
    excludedNumbers.add(number);
    return number;
  });
  const renamed = Object.fromEntries(
    Object.entries(value.renamed).map(([numberText, names]) => {
      const number = Number(numberText);
      assertPositiveInteger(number, `renamed key ${numberText}`);
      return [numberText, parseNames(names, `renamed.${numberText}`)];
    }),
  );
  const groupIds = new Set<string>();
  const groupedNumbers = new Set<number>();
  const groups = value.groups.map((group, groupIndex) => {
    if (!isRecord(group) || typeof group.id !== "string" || !group.id.trim()) {
      throw new Error(`groups[${groupIndex}].id must be a non-empty string`);
    }
    if (groupIds.has(group.id)) {
      throw new Error(`Duplicate campus map group id: ${group.id}`);
    }
    groupIds.add(group.id);
    if (!Array.isArray(group.labelNumbers) || group.labelNumbers.length < 2) {
      throw new Error(
        `groups[${groupIndex}].labelNumbers needs at least two numbers`,
      );
    }
    const numbers = group.labelNumbers.map((number, numberIndex) => {
      assertPositiveInteger(
        number,
        `groups[${groupIndex}].labelNumbers[${numberIndex}]`,
      );
      if (groupedNumbers.has(number)) {
        throw new Error(`Label number appears in multiple groups: ${number}`);
      }
      groupedNumbers.add(number);
      return number;
    });
    const names = parseNames(group, `groups[${groupIndex}]`);
    return { id: group.id, labelNumbers: numbers, ...names };
  });

  const referencedNumbers = new Set([
    ...excluded,
    ...Object.keys(renamed).map(Number),
    ...groups.flatMap((group) => group.labelNumbers),
  ]);
  for (const number of referencedNumbers) {
    if (!labelNumbers.has(number)) {
      throw new Error(`Unknown campus map label number: ${number}`);
    }
  }
  for (const number of groupedNumbers) {
    if (excludedNumbers.has(number)) {
      throw new Error(`Label #${number} cannot be both excluded and grouped`);
    }
    if (renamed[String(number)]) {
      throw new Error(`Label #${number} cannot be both renamed and grouped`);
    }
  }

  return { labels, excluded, renamed, groups };
}

export async function loadCampusMapCuration(
  path: string,
): Promise<CampusMapCuration> {
  return parseCampusMapCuration(JSON.parse(await readFile(path, "utf8")));
}

export async function writeCampusMapCuration(
  path: string,
  curation: CampusMapCuration,
): Promise<void> {
  const document = { _instructions: CURATION_INSTRUCTIONS, ...curation };
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function buildingSourceId(building: CampusBuilding): string {
  return `${building.source.type}/${building.source.id}`;
}

function areaSourceId(area: CampusAreaFeature): string {
  const match = /^osm-(way|relation)-(\d+)-\d+$/.exec(area.id);
  if (!match) throw new Error(`Cannot determine OSM source ID for ${area.id}`);
  return `${match[1]}/${match[2]}`;
}

function featureName(feature: CampusBuilding | CampusAreaFeature): string {
  return feature.names?.zh ?? "未命名地點";
}

export function syncCampusMapLabelCatalog(
  buildings: CampusBuilding[],
  water: CampusAreaFeature[],
  curation: CampusMapCuration,
): CampusMapCuration {
  const labels = curation.labels.map((label) => ({
    ...label,
    featureIds: [...label.featureIds],
    sourceIds: [...label.sourceIds],
  }));
  const labelByFeature = new Map(
    labels.flatMap((label) =>
      label.featureIds.map((featureId) => [featureId, label] as const),
    ),
  );
  const rawLabels = new Map<
    string,
    {
      featureIds: Set<string>;
      sourceIds: Set<string>;
      name: string;
      location: { lat: number; lon: number };
    }
  >();

  for (const feature of [...buildings, ...water]) {
    const key =
      "geometry" in feature ? (feature.identityId ?? feature.id) : feature.id;
    const sourceId =
      "geometry" in feature ? buildingSourceId(feature) : areaSourceId(feature);
    const label = rawLabels.get(key) ?? {
      featureIds: new Set<string>(),
      sourceIds: new Set<string>(),
      name: featureName(feature),
      location: feature.location,
    };
    label.featureIds.add(feature.id);
    label.sourceIds.add(sourceId);
    rawLabels.set(key, label);
  }

  const newLabels: Array<{
    key: string;
    featureIds: Set<string>;
    sourceIds: Set<string>;
    name: string;
    location: { lat: number; lon: number };
  }> = [];
  for (const [key, rawLabel] of rawLabels) {
    const matched = new Set(
      [...rawLabel.featureIds]
        .map((featureId) => labelByFeature.get(featureId))
        .filter((label): label is CampusMapCuration["labels"][number] =>
          Boolean(label),
        ),
    );
    if (matched.size > 1) {
      throw new Error(
        `One visible label maps to multiple hardcoded numbers: ${key}`,
      );
    }
    const existing = [...matched][0];
    if (existing) {
      for (const featureId of rawLabel.featureIds) {
        if (!existing.featureIds.includes(featureId))
          existing.featureIds.push(featureId);
        labelByFeature.set(featureId, existing);
      }
      for (const sourceId of rawLabel.sourceIds) {
        if (!existing.sourceIds.includes(sourceId))
          existing.sourceIds.push(sourceId);
      }
    } else {
      newLabels.push({ ...rawLabel, key });
    }
  }

  newLabels.sort(
    (left, right) =>
      right.location.lat - left.location.lat ||
      left.location.lon - right.location.lon ||
      left.key.localeCompare(right.key),
  );
  let nextNumber = Math.max(0, ...labels.map((label) => label.number)) + 1;
  for (const label of newLabels) {
    labels.push({
      number: nextNumber++,
      featureIds: [...label.featureIds].sort(),
      sourceIds: [...label.sourceIds].sort(),
      name: label.name,
    });
  }

  return { ...curation, labels: labels.sort((a, b) => a.number - b.number) };
}

export function applyCampusMapCuration(
  buildings: CampusBuilding[],
  water: CampusAreaFeature[],
  curation: CampusMapCuration,
): { buildings: CampusBuilding[]; water: CampusAreaFeature[] } {
  const numberByFeature = new Map(
    curation.labels.flatMap((label) =>
      label.featureIds.map((featureId) => [featureId, label.number] as const),
    ),
  );
  const excluded = new Set(curation.excluded);
  const groupByNumber = new Map(
    curation.groups.flatMap((group) =>
      group.labelNumbers.map((number) => [number, group] as const),
    ),
  );
  const missingFeatures = new Set<string>();

  const curatedBuildings = buildings.flatMap((building) => {
    const number = numberByFeature.get(building.id);
    if (!number) {
      missingFeatures.add(building.id);
      return [];
    }
    if (excluded.has(number)) return [];
    const group = groupByNumber.get(number);
    const names = group ?? curation.renamed[String(number)];
    return [
      {
        ...building,
        labelNumber: group ? Math.min(...group.labelNumbers) : number,
        ...(group ? { labelGroupId: `curation:${group.id}` } : {}),
        ...(names
          ? {
              names: {
                zh: names.zh,
                ...(names.en ? { en: names.en } : {}),
              },
            }
          : {}),
      },
    ];
  });

  const curatedWater = water.flatMap((area) => {
    const number = numberByFeature.get(area.id);
    if (!number) {
      missingFeatures.add(area.id);
      return [];
    }
    if (excluded.has(number)) return [];
    if (groupByNumber.has(number)) {
      throw new Error(
        `Water label #${number} cannot be used in a building group`,
      );
    }
    const names = curation.renamed[String(number)];
    return [
      {
        ...area,
        labelNumber: number,
        ...(names
          ? {
              names: {
                zh: names.zh,
                ...(names.en ? { en: names.en } : {}),
              },
            }
          : {}),
      },
    ];
  });

  if (missingFeatures.size > 0) {
    throw new Error(
      `Missing hardcoded label numbers for: ${[...missingFeatures].sort().join(", ")}. Run bun run map:sync-labels.`,
    );
  }

  return { buildings: curatedBuildings, water: curatedWater };
}
