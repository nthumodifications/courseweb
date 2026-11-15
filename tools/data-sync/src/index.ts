/**
 * @fileoverview
 * Data synchronization tools for CourseWeb
 * Provides utilities for syncing course data, syllabus information, and search indices
 */

export {
  scrapeArchivedCourses,
  scrapeSyllabus,
  syncCoursesToAlgolia,
} from "./scrapers";

export {
  default as syncCourses,
  syncCourses as runSyncCourses,
} from "./sync-courses";

export {
  default as startScheduledSync,
  syncCourseData,
} from "./update-courses";

export {
  validateEnvironment,
  retryWithBackoff,
  createSupabaseClient,
  createAlgoliaClient,
  fullWidthToHalfWidth,
  sleep,
  chunkArray,
  formatBytes,
} from "./utils";

export type { Course, Department, SyncEnvironment, SyncResult } from "./types";
export {
  chooseSemestersToSync,
  fetchAutoSyncSemesters,
  nextSemesterId,
  runAutoSync,
} from "./auto-sync";

// Re-export the main sync function for convenience
export const runSync = async (semester?: string) => {
  const { syncCourses } = await import("./sync-courses");
  if (semester) return syncCourses(semester);
  const { runAutoSync } = await import("./auto-sync");
  return runAutoSync({ syncSemester: syncCourses });
};

// Re-export the scheduled update function
export const runScheduledUpdate = (cronPattern?: string, semester?: string) => {
  const { startScheduledSync } = require("./update-courses");
  return startScheduledSync(cronPattern, semester);
};
