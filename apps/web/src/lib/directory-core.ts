import type { DirectoryUnit } from "./directory";

export const getDirectoryTelHref = (
  phone: string | null,
  extension: string | null,
): string | null => {
  if (!phone) return null;
  const normalizedPhone = phone.replace(/[\s-]+/g, "");
  const normalizedExtension = extension?.replace(/[\s-]+/g, "");
  return normalizedExtension
    ? `tel:${normalizedPhone};ext=${normalizedExtension}`
    : `tel:${normalizedPhone}`;
};

export const splitDirectoryExtensions = (extension: string | null): string[] =>
  extension
    ?.split(/[、,\/\s]+/)
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

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
