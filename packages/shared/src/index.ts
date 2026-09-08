// Shared utilities and types for CoursWeb applications

// Core utilities
export * from "./utils";
export * from "./types";
export * from "./constants";
export * from "./config";
export * from "./campus";

// Re-export commonly used external libraries for consistency
export { clsx } from "clsx";
export { z } from "zod";
export { v4 as uuid } from "uuid";
export { format, parseISO } from "date-fns";
