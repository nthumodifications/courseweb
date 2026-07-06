import { FolderDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { RxCollection } from "rxdb";

// Function to get folders
export const getFolders = async (col: RxCollection<FolderDocType>) => {
  const results = await col.find().exec();
  return results.map((doc) => doc.toMutableJSON());
};

// Function to get folder by ID
export const getFolderById = async (
  col: RxCollection<FolderDocType>,
  id: string,
) => {
  const doc = await col.findOne(id).exec();
  return doc ? doc.toMutableJSON() : undefined;
};

// Function to get child folders
export const getChildFolders = async (
  col: RxCollection<FolderDocType>,
  parentId: string | null,
) => {
  const query = col.find({
    selector: {
      parent: parentId,
    },
  });
  const results = await query.exec();
  return results.map((doc) => doc.toMutableJSON());
};

// Function to update folder
export const updateFolder = async (
  col: RxCollection<FolderDocType>,
  folder: FolderDocType,
) => {
  const doc = await col.findOne(folder.id).exec();
  if (!doc) throw new Error(`Folder with id ${folder.id} not found`);
  await doc.patch(folder);
  return doc.toMutableJSON();
};

// Function to create folder
export const createFolder = async (
  col: RxCollection<FolderDocType>,
  folder: FolderDocType,
) => {
  const doc = await col.insert(folder);
  return doc.toMutableJSON();
};

// Function to delete folder
export const deleteFolder = async (
  col: RxCollection<FolderDocType>,
  id: string,
): Promise<boolean> => {
  const doc = await col.findOne(id).exec();
  if (!doc) return false;
  await doc.remove();
  return true;
};

// NOTE: folder expand/collapse state is tracked entirely in local React
// state in page.tsx (`expandedFolders`), which is the sole source read by
// the UI on every render — the persisted `expanded` field was only ever
// consulted once, as an initial per-session fallback default. Writing it
// to the database on every single toggle was therefore redundant
// persistence/replication traffic with no functional benefit, so the
// write itself has been removed.
//
// This function is kept (as a no-op) rather than deleted outright because
// `page.tsx` — which is outside this file's edit scope for this change —
// still imports and calls it on every folder toggle; removing the export
// entirely would break that file's build. A follow-up (touching page.tsx)
// should delete the call site, its import, and the now-unused `expanded`
// field on the folder schema.
// Function to reorder folders.
//
// Accepts the full batch of sibling order updates (e.g. both sides of a
// swap when moving a folder up/down) and writes them in a single
// `bulkUpsert` call. The previous implementation patched one folder at a
// time via two sequential, unbatched `await`s, which could leave the
// collection with colliding/duplicate `order` values if anything
// interleaved between the two writes (or if the second write failed after
// the first succeeded).
export const reorderFolders = async (
  col: RxCollection<FolderDocType>,
  updates: { id: string; order: number }[],
): Promise<boolean> => {
  if (updates.length === 0) return true;

  const docsById = await col.findByIds(updates.map((u) => u.id)).exec();
  const updatedDocs = updates
    .map(({ id, order }) => {
      const doc = docsById.get(id);
      if (!doc) return null;
      return { ...doc.toMutableJSON(), order };
    })
    .filter((d): d is FolderDocType => d !== null);

  if (updatedDocs.length === 0) return false;

  const result = await col.bulkUpsert(updatedDocs);
  return result.error.length === 0;
};

// Function to change folder parent
export const changeFolderParent = async (
  col: RxCollection<FolderDocType>,
  folderId: string,
  newParentId: string | null,
): Promise<boolean> => {
  const doc = await col.findOne(folderId).exec();
  if (!doc) return false;

  await doc.patch({ parent: newParentId });
  return true;
};

// Ensure unsorted folder exists
export async function ensureUnsortedFolder(
  collection: RxCollection<FolderDocType>,
) {
  try {
    // Check if _unsorted folder exists
    const unsortedFolder = await collection
      .findOne({
        selector: { id: "_unsorted" },
      })
      .exec();

    // If not, create it
    if (!unsortedFolder) {
      await collection.incrementalUpsert({
        id: "_unsorted",
        title: "未分類",
        parent: "planner-1",
        min: 0,
        max: 0,
        metric: "credits",
        requireChildValidation: false,
        titlePlacement: "top",
        order: 999,
      });
      console.log("Created _unsorted folder");
    }
  } catch (error) {
    console.error("Error ensuring unsorted folder exists:", error);
  }
}
