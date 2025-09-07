/**
 * @fileoverview
 * One-time course synchronization script
 * Syncs archived courses, syllabus data, and Algolia search index
 */

import { validateEnvironment } from "./utils";
import {
  scrapeArchivedCourses,
  scrapeSyllabus,
  syncCoursesToAlgolia,
} from "./scrapers";
import type { SyncResult } from "./types";

export const syncCourses = async (
  semester: string = "11410",
): Promise<SyncResult> => {
  try {
    console.log("🚀 Starting course synchronization...");
    const startTime = Date.now();

    // Validate environment variables
    const env = validateEnvironment();
    console.log("✅ Environment validated");

    // Step 1: Scrape archived courses
    console.log(`📚 Scraping archived courses for semester ${semester}...`);
    const courses = await scrapeArchivedCourses(env, semester);
    console.log(`✅ Scraped ${courses.length} courses`);

    // Step 2: Scrape syllabus data
    console.log("📝 Scraping syllabus data...");
    await scrapeSyllabus(env, semester, courses);
    console.log("✅ Syllabus scraping completed");

    // Step 3: Sync to Algolia
    console.log("🔍 Syncing courses to Algolia...");
    await syncCoursesToAlgolia(env, semester);
    console.log("✅ Algolia sync completed");

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(
      `🎉 Course synchronization completed successfully in ${duration}s`,
    );

    return {
      success: true,
      stats: {
        coursesScraped: courses.length,
        syllabusDownloaded: courses.length,
        algoliaRecordsUpdated: courses.length,
      },
    };
  } catch (error) {
    console.error("❌ Error during course synchronization:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export default syncCourses;

// If this file is run directly, execute the sync
if (require.main === module) {
  const semester = process.argv[2] || "11410";
  console.log(`Running sync for semester: ${semester}`);

  syncCourses(semester)
    .then((result) => {
      if (result.success) {
        console.log("✅ Sync completed successfully");
        if (result.stats) {
          console.log(`📊 Stats:`, result.stats);
        }
        process.exit(0);
      } else {
        console.error("❌ Sync failed:", result.error?.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}
