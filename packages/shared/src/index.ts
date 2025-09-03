// Shared utilities and types for CoursWeb applications
export * from "./types";
export * from "./utils";
export * from "./constants";
export * from "./config";

// Re-export commonly used external libraries for consistency
export { clsx } from "clsx";
export { z } from "zod";
export { v4 as uuid } from "uuid";
export { format, parseISO } from "date-fns";
export { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
