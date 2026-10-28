import type { LostAndFoundItem } from "./library-lost-and-found";

export const getLostAndFoundTypes = (
  items: readonly LostAndFoundItem[],
): string[] =>
  [...new Set(items.map((item) => item.type).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

export const filterLostAndFoundItems = (
  items: readonly LostAndFoundItem[],
  type: string,
  query: string,
): LostAndFoundItem[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (!normalizedQuery) return true;
    return [item.type, item.date, item.location, item.description].some(
      (value) => value.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
};
