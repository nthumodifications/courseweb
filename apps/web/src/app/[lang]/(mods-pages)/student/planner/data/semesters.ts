import { SemesterDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
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

  if (!doc) {
    // Previously this silently returned the unsaved `semester` input,
    // which made callers believe the save succeeded even though nothing
    // was persisted. Throw so callers can detect and surface the failure.
    throw new Error(`Semester with id ${semester.id} not found`);
  }

  await doc.patch(semester);
  return doc.toMutableJSON();
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

// Term code -> label mapping used whenever a semester name/ID is
// auto-generated or displayed. "1" = fall/autumn, "2" = spring,
// "3" = summer. Centralizing this avoids the previous bug where term "3"
// (summer) was mislabeled as spring by a two-way `term === "1" ? a : b`
// check that only ever distinguished "1" from "everything else".
export const SEMESTER_TERM_LABELS: Record<string, string> = {
  "1": "秋季學期",
  "2": "春季學期",
  "3": "暑期",
};

export const getSemesterTermLabel = (term: string): string =>
  SEMESTER_TERM_LABELS[term] ?? term;

// Function to generate semester ID
export const generateSemesterId = (year: string, term: string): string => {
  // ROC semester ID format: 3-digit ROC year + 1-digit term code + a
  // trailing "0" filler, e.g. year "113" + term "1" (fall) -> "11310",
  // term "3" (summer) -> "11330". This previously used
  // `term.padEnd(2, "0")`, which happened to produce the same result for
  // single-character terms but relied on padEnd's right-padding semantics
  // rather than an explicit, self-documenting format — fragile if `term`
  // were ever anything other than a single digit.
  return `${year}${term}0`;
};
