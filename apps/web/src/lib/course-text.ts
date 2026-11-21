import { decode } from "html-entities";

/** Decode course data that is rendered as plain text. */
export const decodeCourseText = (value: string) => decode(value);

export const COURSE_INSTRUCTOR_SEPARATOR = " - ";
