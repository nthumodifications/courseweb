import type { DiningShop } from "./types";
import { checkOpen, getTodayKey } from "./shop-hours";

export type ShopCategory =
  | "meal"
  | "convenience"
  | "drink-dessert"
  | "not-food";

const NOT_FOOD_NAMES = new Set([
  "眼鏡部",
  "洗衣部",
  "理髮部",
  "利捷打字行",
  "水木書苑",
]);

const CONVENIENCE_NAMES = new Set(["7-ELEVEN", "全家便利商店"]);

const DRINK_DESSERT_NAMES = new Set([
  "珈名鮮茶",
  "販冰冰手作甜品",
  "丘森茶室",
  "Ginzeng",
  "胖達咖啡",
  "Touch Cafe",
  "茗釀茶品",
  "路易莎咖啡",
]);

export const classifyShop = (name: string): ShopCategory => {
  if (NOT_FOOD_NAMES.has(name)) return "not-food";
  if (CONVENIENCE_NAMES.has(name)) return "convenience";
  if (DRINK_DESSERT_NAMES.has(name)) return "drink-dessert";
  return "meal";
};

export const getShopKey = (shop: Pick<DiningShop, "area" | "name">) =>
  `${shop.area}|${shop.name}`;

export const getPickRow = <T>(
  selected: T,
  shuffleCandidates: readonly T[],
  shuffleIndex: number,
) => {
  if (shuffleCandidates.length === 0) {
    return { shops: [selected], visibleIndex: 0 };
  }

  return {
    shops: shuffleCandidates,
    visibleIndex: Math.min(
      shuffleCandidates.length - 1,
      Math.max(0, shuffleIndex),
    ),
  };
};

export const getPickActionState = <T>(shop: T | null, isShuffling: boolean) =>
  isShuffling ? { disabled: true, shop: null } : { disabled: false, shop };

type PickOptions = {
  now: Date;
  area: string;
  includeSnacks: boolean;
  hidden: ReadonlySet<string> | readonly string[];
};

export const pickCandidates = (
  shops: readonly DiningShop[],
  { now, area, includeSnacks, hidden }: PickOptions,
) => {
  const today = getTodayKey(now);
  const hiddenKeys = new Set(hidden);

  return shops.filter((shop) => {
    if (area && area !== "anywhere" && shop.area !== area) return false;
    if (hiddenKeys.has(getShopKey(shop))) return false;
    if (!checkOpen(shop.schedule[today], now)[0]) return false;

    const category = classifyShop(shop.name);
    if (category === "not-food") return false;
    return (
      includeSnacks ||
      (category !== "convenience" && category !== "drink-dessert")
    );
  });
};

export const pickRandom = <T>(
  candidates: readonly T[],
  rng: () => number = Math.random,
) => {
  if (candidates.length === 0) return undefined;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, rng()) * candidates.length),
  );
  return candidates[index];
};
