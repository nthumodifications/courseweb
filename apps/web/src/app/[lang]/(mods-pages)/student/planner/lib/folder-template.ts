import type { FolderDocType } from "../rxdb";

export type FolderTemplateEntry = Pick<
  FolderDocType,
  | "id"
  | "title"
  | "parent"
  | "min"
  | "max"
  | "metric"
  | "requireChildValidation"
  | "titlePlacement"
  | "order"
>;

/** Shared parser for folder-management imports and the first-run wizard. */
export function parseFolderTemplate(contents: string): FolderTemplateEntry[] {
  const imported: unknown = JSON.parse(contents);
  if (
    !Array.isArray(imported) ||
    !imported.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        Boolean(item.id) &&
        typeof item.title === "string" &&
        Boolean(item.title) &&
        typeof item.min === "number" &&
        typeof item.max === "number" &&
        typeof item.parent === "string" &&
        Boolean(item.parent),
    )
  ) {
    throw new Error("Invalid folder template");
  }

  return imported as FolderTemplateEntry[];
}
