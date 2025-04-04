import { ItemDocType } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { RxCollection } from "rxdb";
import { CourseStatus } from "../types";

// Function to get all courses
export const getCourseItems = async (col: RxCollection<ItemDocType>) => {
  const docs = await col.find().exec();
  return docs.map((doc) => doc.toMutableJSON());
};

// Function to get course by ID
export const getCourseItemById = async (
  col: RxCollection<ItemDocType>,
  id: string,
) => {
  const doc = await col.findOne({ selector: { id } }).exec();
  return doc ? doc.toMutableJSON() : null;
};

export const getCourseItemByUUID = async (
  col: RxCollection<ItemDocType>,
  uuid: string,
) => {
  const doc = await col.findOne({ selector: { uuid } }).exec();
  return doc ? doc.toMutableJSON() : null;
};

// Function to get courses by parent folder
export const getCourseItemsByParent = async (
  col: RxCollection<ItemDocType>,
  parentId: string,
) => {
  const docs = await col.find({ selector: { parent: parentId } }).exec();
  return docs.map((doc) => doc.toMutableJSON());
};

// Function to get courses by semester
export const getCourseItemsBySemester = async (
  col: RxCollection<ItemDocType>,
  semester: string,
) => {
  const docs = await col.find({ selector: { semester } }).exec();
  return docs.map((doc) => doc.toMutableJSON());
};

// Function to update course
export const updateCourseItem = async (
  col: RxCollection<ItemDocType>,
  course: ItemDocType,
) => {
  const newCourse = await col
    .findOne({ selector: { uuid: course.uuid } })
    .update({
      $set: { ...course, updatedAt: new Date().toISOString() },
    });
  return newCourse ? newCourse.toMutableJSON() : null;
};

// Function to create course
export const createCourseItem = async (
  col: RxCollection<ItemDocType>,
  course: ItemDocType,
) => {
  const newCourse = await col.insert(course);
  return newCourse.toMutableJSON();
};

// Function to update course status
export const updateCourseStatus = async (
  col: RxCollection<ItemDocType>,
  uuid: string,
  status: CourseStatus,
) => {
  const course = await col.findOne({ selector: { uuid } }).update({
    $set: { status },
  });
  return course ? course.toMutableJSON() : undefined;
};

// Function to update course semester
export const updateCourseSemester = async (
  col: RxCollection<ItemDocType>,
  uuid: string,
  semester: string | undefined,
) => {
  const course = await col.findOne({ selector: { uuid } }).update({
    $set: { semester },
  });
  return course ? course.toMutableJSON() : undefined;
};
