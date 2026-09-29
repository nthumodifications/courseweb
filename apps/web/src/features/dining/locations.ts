export type DiningLocation =
  | "food-court"
  | "shui-mu"
  | "feng-yun"
  | "mxic"
  | "hss"
  | "guest-house-ii"
  | "general-iv";

type DiningBuilding = { sources: string[]; area: RegExp };

// Match API location fields, never shop names or group headings with contacts.
// Keep this module independent of the Three.js map so shops stay lightweight.
const floorSuffix = "(?:\\s*(\\d+|[一二三四五六七八九十]+)\\s*樓)?$";
const buildings: Record<DiningLocation, DiningBuilding> = {
  "food-court": {
    sources: ["way/158391363", "way/749979081"],
    area: new RegExp("^小吃部" + floorSuffix),
  },
  "shui-mu": {
    sources: ["way/158364457"],
    area: new RegExp("^水木生活中心" + floorSuffix),
  },
  "feng-yun": {
    sources: ["way/138080029"],
    area: new RegExp("^風雲(?:樓)?" + floorSuffix),
  },
  mxic: {
    sources: ["way/180365523"],
    area: new RegExp("^旺宏館" + floorSuffix),
  },
  hss: {
    sources: ["relation/3809408"],
    area: new RegExp("^(?:人社院|人文社會學院)" + floorSuffix),
  },
  "guest-house-ii": {
    sources: ["way/180522508"],
    area: new RegExp("^第二招待所" + floorSuffix),
  },
  "general-iv": {
    sources: ["way/180365525"],
    area: new RegExp("^(?:綜四館|第四綜合大樓)" + floorSuffix),
  },
};

const locations = Object.keys(buildings) as DiningLocation[];

function parseFloor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const digits = "一二三四五六七八九";
  if (digits.includes(value) && value.length === 1)
    return digits.indexOf(value) + 1;
  const match = /^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/.exec(
    value,
  );
  if (!match) return undefined;
  return (
    (match[1] ? digits.indexOf(match[1]) + 1 : 1) * 10 +
    (match[2] ? digits.indexOf(match[2]) + 1 : 0)
  );
}

export function getDiningLocationForSource(source: string) {
  return locations.find((location) =>
    buildings[location].sources.includes(source),
  );
}

export function getDiningLocationForArea(area: string) {
  for (const location of locations) {
    const match = buildings[location].area.exec(area.trim());
    if (match) {
      return {
        location,
        floor: location === "food-court" ? undefined : parseFloor(match[1]),
      };
    }
  }
  return undefined;
}

export function getDiningMapHref(lang: string | undefined, area: string) {
  const match = getDiningLocationForArea(area);
  if (!match) return undefined;
  const feature = `osm-${buildings[match.location].sources[0].replace("/", "-")}-0`;
  const query = new URLSearchParams({ feature });
  return `/${lang === "en" ? "en" : "zh"}/map?${query.toString()}`;
}
