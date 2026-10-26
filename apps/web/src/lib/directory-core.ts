import type { DirectoryUnit } from "./directory";

export const getDirectoryTelHref = (
  phone: string | null,
  extension: string | null,
): string | null => {
  if (!phone) return null;
  return extension ? `tel:${phone};ext=${extension}` : `tel:${phone}`;
};

export const filterDirectoryUnits = (
  units: readonly DirectoryUnit[],
  query: string,
  localize: (value: string) => string = (value) => value,
): DirectoryUnit[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...units];

  return units.filter((unit) =>
    [unit.name, unit.parentName ?? ""]
      .flatMap((value) => [value, localize(value)])
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
};
