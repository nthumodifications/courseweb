export type LatLon = {
  lat: number;
  lon: number;
};

export type WorldPosition = {
  x: number;
  z: number;
};

export type CampusBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

/** GeoJSON coordinate order: [longitude, latitude]. */
export type GeoCoordinate = [longitude: number, latitude: number];

export type CampusBuildingIdentity = {
  id: string;
  names: {
    zh: string;
    en?: string;
  };
  venue: {
    code: string;
    prefix: string;
    aliases: string[];
  };
  osmElementIds: string[];
};

export type CampusBuilding = {
  id: string;
  identityId?: string;
  labelGroupId?: string;
  labelNumber?: number;
  source: {
    type: "way" | "relation";
    id: number;
  };
  names: {
    zh: string;
    en?: string;
  };
  venue?: {
    code: string;
    prefix: string;
    aliases: string[];
  };
  location: LatLon;
  geometry: {
    footprint: GeoCoordinate[];
    holes?: GeoCoordinate[][];
    height?: number;
    levels?: number;
  };
  googleMaps?: {
    query: string;
  };
};

export type CampusLinearFeature = {
  id: string;
  kind: "road" | "path";
  roadClass?: "major" | "local" | "service";
  points: GeoCoordinate[];
  width: number;
};

export type CampusAreaKind =
  | "water"
  | "boundary"
  | "grass"
  | "park"
  | "wood"
  | "sports-pitch"
  | "athletics-track"
  | "parking";

export type CampusAreaFeature = {
  id: string;
  kind: CampusAreaKind;
  sport?: string;
  labelNumber?: number;
  names?: {
    zh: string;
    en?: string;
  };
  location: LatLon;
  polygon: GeoCoordinate[];
  holes?: GeoCoordinate[][];
};

export type CampusTree = {
  id: string;
  location: LatLon;
};

export type CampusMapFeature = CampusBuilding | CampusAreaFeature;

export type CampusMapData = {
  version: 1;
  generatedAt: string;
  origin: LatLon;
  bounds: CampusBounds;
  attribution: {
    text: string;
    url: string;
    license: string;
  };
  buildings: CampusBuilding[];
  roads: CampusLinearFeature[];
  paths: CampusLinearFeature[];
  water: CampusAreaFeature[];
  areas: CampusAreaFeature[];
  trees: CampusTree[];
  boundary?: CampusAreaFeature;
};
