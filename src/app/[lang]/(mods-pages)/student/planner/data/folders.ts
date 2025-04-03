import { FolderDocType } from "@/config/rxdb";
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

// Function to toggle folder expansion
export const toggleFolderExpansion = async (
  col: RxCollection<FolderDocType>,
  id: string,
) => {
  const doc = await col.findOne(id).exec();
  if (!doc) return undefined;

  const folder = doc.toMutableJSON();
  await doc.patch({ expanded: !folder.expanded });
  return folder;
};

// Function to calculate folder completion
export const calculateFolderCompletion = async (
  col: RxCollection<FolderDocType>,
  folderId: string,
  courseItems: any[],
): Promise<{ completed: number; total: number }> => {
  const folder = await getFolderById(col, folderId);
  if (!folder) {
    return { completed: 0, total: 0 };
  }

  // Get courses in this folder
  const folderCourses = courseItems.filter(
    (course) => course.parent === folderId,
  );

  // Calculate completed credits/courses
  let completed = 0;
  if (folder.metric === "credits") {
    completed = folderCourses
      .filter((course) => course.status === "completed")
      .reduce((sum, course) => sum + course.credits, 0);
  } else {
    completed = folderCourses.filter(
      (course) => course.status === "completed",
    ).length;
  }

  return { completed, total: folder.min };
};

// Function to reorder folders
export const reorderFolders = async (
  col: RxCollection<FolderDocType>,
  folderId: string,
  newOrder: number,
): Promise<boolean> => {
  const doc = await col.findOne(folderId).exec();
  if (!doc) return false;

  await doc.patch({ order: newOrder });
  return true;
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
