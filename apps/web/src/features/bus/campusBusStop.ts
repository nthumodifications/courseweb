export function campusBusStopId(index: number): string {
  return `campus-stop-${index}`;
}

export function withCampusBusStopIds<T>(
  items: readonly T[],
): Array<T & { id: string }> {
  return items.map((item, index) => ({ ...item, id: campusBusStopId(index) }));
}

export function findCampusBusStopIndex(
  requestedStop: string | null | undefined,
  stationsZh: readonly string[],
  stationsEn: readonly string[],
  past: readonly boolean[] = [],
): number | undefined {
  const query = requestedStop?.trim();
  if (!query) return undefined;

  const englishQuery = query.toLocaleLowerCase("en");
  const matches = stationsZh.flatMap((station, index) => {
    const matchesZh = station.trim() === query;
    const matchesEn =
      stationsEn[index]?.trim().toLocaleLowerCase("en") === englishQuery;
    return matchesZh || matchesEn ? [index] : [];
  });

  return matches.find((index) => !past[index]) ?? matches[0];
}
