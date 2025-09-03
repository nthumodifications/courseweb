// Shared utilities for CoursWeb applications
// TODO: Move utilities from src/helpers/ and src/lib/ here in Phase 5

// Placeholder export to prevent build errors
export function placeholder() {
  return "placeholder";
}

// Re-export commonly used external libraries for consistency
export { clsx } from "clsx";
export { z } from "zod";
export { v4 as uuid } from "uuid";
export { format, parseISO } from "date-fns";
// TODO: Add date-fns-tz exports when needed
