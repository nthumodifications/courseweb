import { SemesterDocType } from "@/config/rxdb";
import { CourseStatus } from "../types";
import { RxCollection } from "rxdb";

// Function to get all semesters
export const getSemesters = async (col: RxCollection<SemesterDocType>) => {
  const docs = await col.find().exec();
  return docs.map((doc) => doc.toMutableJSON());
};

// Function to get active semesters
export const getActiveSemesters = async (
  col: RxCollection<SemesterDocType>,
) => {
  const docs = await col
    .find({
      selector: {
        isActive: true,
      },
    })
    .exec();
  return docs.map((doc) => doc.toMutableJSON());
};

// Function to get semester by ID
export const getSemesterById = async (
  col: RxCollection<SemesterDocType>,
  id: string,
) => {
  const doc = await col
    .findOne({
      selector: { id },
    })
    .exec();
  return doc ? doc.toMutableJSON() : undefined;
};

// Function to update semester
export const updateSemester = async (
  col: RxCollection<SemesterDocType>,
  semester: SemesterDocType,
) => {
  const doc = await col
    .findOne({
      selector: { id: semester.id },
    })
    .exec();

  if (doc) {
    await doc.patch(semester);
    return doc.toMutableJSON();
  }
  return semester;
};

// Function to create semester
export const createSemester = async (
  col: RxCollection<SemesterDocType>,
  semester: SemesterDocType,
) => {
  const doc = await col.insert(semester);
  return doc.toMutableJSON();
};

// Function to delete semester
export const deleteSemester = async (
  col: RxCollection<SemesterDocType>,
  id: string,
): Promise<boolean> => {
  const doc = await col.findOne(id).exec();
  if (!doc) return false;
  await doc.remove();
  return true;
};

// Function to toggle semester active status
export const toggleSemesterActive = async (
  col: RxCollection<SemesterDocType>,
  id: string,
) => {
  const doc = await col.findOne(id).exec();
  if (!doc) return undefined;

  const semester = doc.toMutableJSON();
  await doc.patch({ isActive: !semester.isActive });
  return semester;
};

// Function to generate semester ID
export const generateSemesterId = (year: string, term: string): string => {
  // to SSSTT format
  return `${year}${term.padEnd(2, "0")}`;
};
