import { readFile, writeFile } from "node:fs/promises";
import type {
  CampusAreaFeature,
  CampusBuilding,
  LatLon,
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
  excludedSourceIds: string[];
  renamed: Record<string, CurationNames>;
  groups: Array<{
    id: string;
    labelNumber: number;
    zh: string;
    en?: string;
  }>;
  illustrativeTreeClusters: Array<{
    id: string;
    locations: LatLon[];
  }>;
  illustrativeVegetationAreas: Array<{
    id: string;
    kind: "grass" | "wood";
    polygon: LatLon[];
  }>;
};

const SOURCE_ID_PATTERN = /^(way|relation)\/\d+$/;
const FEATURE_ID_PATTERN = /^osm-(way|relation)-\d+-\d+$/;
const CURATION_INSTRUCTIONS = {
  apply: "Run: bun run map:generate",
  syncLabels:
    "Run: bun run map:sync-labels only when OpenStreetMap adds new locations.",
  labels:
    "Only visible map locations belong here. Numbers stay contiguous and are compacted automatically.",
  excludedSourceIds:
    "Permanent OSM source-ID denylist. Add way/123 or relation/123, then run bun run map:generate.",
  renamed: "Map a # number to a bilingual display name.",
  groups:
    "A merged multi-feature label. Its member OSM IDs live together in the matching labels entry.",
  illustrativeTreeClusters:
    "Sparse non-interactive tree markers. Edit lat/lon locations, then run bun run map:generate.",
  illustrativeVegetationAreas:
    "Flat 2D grass or wood polygons. Edit lat/lon vertices, then run bun run map:generate.",
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
  if (!Array.isArray(value.excludedSourceIds)) {
    throw new Error("Campus map curation excludedSourceIds must be an array");
  }
  if (!isRecord(value.renamed)) {
    throw new Error("Campus map curation renamed must be an object");
  }
  if (!Array.isArray(value.groups)) {
    throw new Error("Campus map curation groups must be an array");
  }
  const treeClusterValues = value.illustrativeTreeClusters ?? [];
  if (!Array.isArray(treeClusterValues)) {
    throw new Error(
      "Campus map curation illustrativeTreeClusters must be an array",
    );
  }
  const vegetationAreaValues = value.illustrativeVegetationAreas ?? [];
  if (!Array.isArray(vegetationAreaValues)) {
    throw new Error(
      "Campus map curation illustrativeVegetationAreas must be an array",
    );
  }

  const labelNumbers = new Set<number>();
  const labeledFeatures = new Set<string>();
  const labeledSources = new Set<string>();
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
      if (labeledSources.has(sourceId)) {
        throw new Error(`Duplicate campus map source ID: ${sourceId}`);
      }
      labeledSources.add(sourceId);
      return sourceId;
    });
    const featureSourceIds = new Set(
      featureIds.map((featureId) => generatedFeatureSourceId(featureId)),
    );
    for (const sourceId of sourceIds) {
      if (!featureSourceIds.has(sourceId)) {
        throw new Error(
          `labels[${labelIndex}] source ID ${sourceId} has no matching feature ID`,
        );
      }
    }
    for (const sourceId of featureSourceIds) {
      if (!sourceId || !sourceIds.includes(sourceId)) {
        throw new Error(
          `labels[${labelIndex}] feature IDs must have matching source IDs`,
        );
      }
    }
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

  const excludedSourceIdSet = new Set<string>();
  const excludedSourceIds = value.excludedSourceIds.map((sourceId, index) => {
    assertSourceId(sourceId, `excludedSourceIds[${index}]`);
    if (excludedSourceIdSet.has(sourceId)) {
      throw new Error(`Duplicate excluded OSM source ID: ${sourceId}`);
    }
    excludedSourceIdSet.add(sourceId);
    return sourceId;
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
    assertPositiveInteger(
      group.labelNumber,
      `groups[${groupIndex}].labelNumber`,
    );
    if (groupedNumbers.has(group.labelNumber)) {
      throw new Error(
        `Label number appears in multiple groups: ${group.labelNumber}`,
      );
    }
    groupedNumbers.add(group.labelNumber);
    const names = parseNames(group, `groups[${groupIndex}]`);
    return { id: group.id, labelNumber: group.labelNumber, ...names };
  });
  const treeClusterIds = new Set<string>();
  const illustrativeTreeClusters = treeClusterValues.map(
    (cluster, clusterIndex) => {
      if (
        !isRecord(cluster) ||
        typeof cluster.id !== "string" ||
        !cluster.id.trim()
      ) {
        throw new Error(
          `illustrativeTreeClusters[${clusterIndex}].id must be a non-empty string`,
        );
      }
      if (treeClusterIds.has(cluster.id)) {
        throw new Error(
          `Duplicate illustrative tree cluster id: ${cluster.id}`,
        );
      }
      treeClusterIds.add(cluster.id);
      if (!Array.isArray(cluster.locations) || cluster.locations.length === 0) {
        throw new Error(
          `illustrativeTreeClusters[${clusterIndex}].locations must not be empty`,
        );
      }
      const locations = cluster.locations.map((location, locationIndex) => {
        if (
          !isRecord(location) ||
          typeof location.lat !== "number" ||
          !Number.isFinite(location.lat) ||
          location.lat < -90 ||
          location.lat > 90 ||
          typeof location.lon !== "number" ||
          !Number.isFinite(location.lon) ||
          location.lon < -180 ||
          location.lon > 180
        ) {
          throw new Error(
            `illustrativeTreeClusters[${clusterIndex}].locations[${locationIndex}] must contain valid lat/lon coordinates`,
          );
        }
        return { lat: location.lat, lon: location.lon };
      });
      return { id: cluster.id, locations };
    },
  );
  const vegetationAreaIds = new Set<string>();
  const illustrativeVegetationAreas = vegetationAreaValues.map(
    (area, areaIndex) => {
      if (!isRecord(area) || typeof area.id !== "string" || !area.id.trim()) {
        throw new Error(
          `illustrativeVegetationAreas[${areaIndex}].id must be a non-empty string`,
        );
      }
      if (vegetationAreaIds.has(area.id)) {
        throw new Error(
          `Duplicate illustrative vegetation area id: ${area.id}`,
        );
      }
      vegetationAreaIds.add(area.id);
      if (area.kind !== "grass" && area.kind !== "wood") {
        throw new Error(
          `illustrativeVegetationAreas[${areaIndex}].kind must be grass or wood`,
        );
      }
      if (!Array.isArray(area.polygon) || area.polygon.length < 3) {
        throw new Error(
          `illustrativeVegetationAreas[${areaIndex}].polygon needs at least three vertices`,
        );
      }
      const polygon = area.polygon.map((location, locationIndex) => {
        if (
          !isRecord(location) ||
          typeof location.lat !== "number" ||
          !Number.isFinite(location.lat) ||
          location.lat < -90 ||
          location.lat > 90 ||
          typeof location.lon !== "number" ||
          !Number.isFinite(location.lon) ||
          location.lon < -180 ||
          location.lon > 180
        ) {
          throw new Error(
            `illustrativeVegetationAreas[${areaIndex}].polygon[${locationIndex}] must contain valid lat/lon coordinates`,
          );
        }
        return { lat: location.lat, lon: location.lon };
      });
      return { id: area.id, kind: area.kind, polygon };
    },
  );

  const referencedNumbers = new Set([
    ...Object.keys(renamed).map(Number),
    ...groups.map((group) => group.labelNumber),
  ]);
  for (const number of referencedNumbers) {
    if (!labelNumbers.has(number)) {
      throw new Error(`Unknown campus map label number: ${number}`);
    }
  }
  for (const number of groupedNumbers) {
    if (renamed[String(number)]) {
      throw new Error(`Label #${number} cannot be both renamed and grouped`);
    }
  }

  return {
    labels,
    excludedSourceIds,
    renamed,
    groups,
    illustrativeTreeClusters,
    illustrativeVegetationAreas,
  };
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

function generatedFeatureSourceId(featureId: string): string | undefined {
  const match = /^osm-(way|relation)-(\d+)-\d+$/.exec(featureId);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

export function compactCampusMapLabelCatalog(
  curation: CampusMapCuration,
): CampusMapCuration {
  const excludedSourceIds = new Set(curation.excludedSourceIds);
  const visibleLabels = [...curation.labels]
    .sort((left, right) => left.number - right.number)
    .map((label) => ({
      ...label,
      featureIds: label.featureIds.filter((featureId) => {
        const sourceId = generatedFeatureSourceId(featureId);
        return !sourceId || !excludedSourceIds.has(sourceId);
      }),
      sourceIds: label.sourceIds.filter(
        (sourceId) => !excludedSourceIds.has(sourceId),
      ),
    }))
    .filter(
      (label) => label.featureIds.length > 0 && label.sourceIds.length > 0,
    );
  const compactNumberByOldNumber = new Map(
    visibleLabels.map((label, index) => [label.number, index + 1] as const),
  );
  const labels = visibleLabels.map((label, index) => ({
    ...label,
    number: index + 1,
    featureIds: [...label.featureIds],
    sourceIds: [...label.sourceIds],
  }));
  const renamed: Record<string, CurationNames> = {};

  for (const [oldNumberText, names] of Object.entries(curation.renamed)) {
    const newNumber = compactNumberByOldNumber.get(Number(oldNumberText));
    if (newNumber) renamed[String(newNumber)] = names;
  }

  const groups = curation.groups.flatMap((group) => {
    const labelNumber = compactNumberByOldNumber.get(group.labelNumber);
    return labelNumber ? [{ ...group, labelNumber }] : [];
  });

  return { ...curation, labels, renamed, groups };
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
  const compactedCuration = compactCampusMapLabelCatalog(curation);
  const excludedSourceIds = new Set(compactedCuration.excludedSourceIds);
  const labels = compactedCuration.labels.map((label) => ({
    ...label,
    featureIds: [...label.featureIds],
    sourceIds: [...label.sourceIds],
  }));
  const labelByFeature = new Map(
    labels.flatMap((label) =>
      label.featureIds.map((featureId) => [featureId, label] as const),
    ),
  );
  const labelBySource = new Map(
    labels.flatMap((label) =>
      label.sourceIds.map((sourceId) => [sourceId, label] as const),
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
    if (excludedSourceIds.has(sourceId)) continue;
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
      [
        ...[...rawLabel.featureIds].map((featureId) =>
          labelByFeature.get(featureId),
        ),
        ...[...rawLabel.sourceIds].map((sourceId) =>
          labelBySource.get(sourceId),
        ),
      ].filter((label): label is CampusMapCuration["labels"][number] =>
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
        if (!existing.sourceIds.includes(sourceId)) {
          existing.sourceIds.push(sourceId);
        }
        labelBySource.set(sourceId, existing);
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

  return {
    ...compactedCuration,
    labels: labels.sort((a, b) => a.number - b.number),
  };
}

export function applyCampusMapCuration(
  buildings: CampusBuilding[],
  water: CampusAreaFeature[],
  curation: CampusMapCuration,
): { buildings: CampusBuilding[]; water: CampusAreaFeature[] } {
  const compactedCuration = compactCampusMapLabelCatalog(curation);
  const numberByFeature = new Map(
    compactedCuration.labels.flatMap((label) =>
      label.featureIds.map((featureId) => [featureId, label.number] as const),
    ),
  );
  const excludedSourceIds = new Set(compactedCuration.excludedSourceIds);
  const groupByNumber = new Map(
    compactedCuration.groups.map(
      (group) => [group.labelNumber, group] as const,
    ),
  );
  const missingFeatures = new Set<string>();

  const curatedBuildings = buildings.flatMap((building) => {
    if (excludedSourceIds.has(buildingSourceId(building))) return [];
    const number = numberByFeature.get(building.id);
    if (!number) {
      missingFeatures.add(building.id);
      return [];
    }
    const group = groupByNumber.get(number);
    const names = group ?? compactedCuration.renamed[String(number)];
    return [
      {
        ...building,
        labelNumber: number,
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
    if (excludedSourceIds.has(areaSourceId(area))) return [];
    const number = numberByFeature.get(area.id);
    if (!number) {
      missingFeatures.add(area.id);
      return [];
    }
    if (groupByNumber.has(number)) {
      throw new Error(
        `Water label #${number} cannot be used in a building group`,
      );
    }
    const names = compactedCuration.renamed[String(number)];
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

export function applyCampusEnvironmentCuration(
  areas: CampusAreaFeature[],
  curation: CampusMapCuration,
): CampusAreaFeature[] {
  const compactedCuration = compactCampusMapLabelCatalog(curation);
  const numberByFeature = new Map(
    compactedCuration.labels.flatMap((label) =>
      label.featureIds.map((featureId) => [featureId, label.number] as const),
    ),
  );
  const excludedSourceIds = new Set(compactedCuration.excludedSourceIds);
  const grouped = new Set(
    compactedCuration.groups.map((group) => group.labelNumber),
  );

  return areas.flatMap((area) => {
    const sourceIdMatch = /^osm-(way|relation)-(\d+)-\d+$/.exec(area.id);
    const sourceId = sourceIdMatch
      ? `${sourceIdMatch[1]}/${sourceIdMatch[2]}`
      : undefined;
    if (sourceId && excludedSourceIds.has(sourceId)) return [];
    const number = numberByFeature.get(area.id);
    if (!number) return [area];
    if (grouped.has(number)) {
      throw new Error(
        `Environment area label #${number} cannot be used in a building group`,
      );
    }
    const names = compactedCuration.renamed[String(number)];
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
}
