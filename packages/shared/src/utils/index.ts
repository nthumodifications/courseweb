// Shared utilities for CoursWeb applications

// Core utilities
export * from "./array";
export * from "./dates";
export * from "./colors";
export * from "./courses";
export * from "./semester";
export * from "./timetable";
export * from "./characters";
export * from "./fetch";

// Re-export commonly used external libraries for consistency
export { clsx } from "clsx";
export { z } from "zod";
export { v4 as uuid } from "uuid";
export { format, parseISO } from "date-fns";
