/**
 * @fileoverview
 * Scheduled course synchronization script
 * Runs course sync on a daily schedule (8:00 AM GMT+8)
 */

import schedule from "node-schedule";
import { validateEnvironment } from "./utils";
import {
  scrapeArchivedCourses,
  scrapeSyllabus,
  syncCoursesToAlgolia,
} from "./scrapers";
import type { SyncResult } from "./types";

const syncCourseData = async (
  semester: string = "11410",
): Promise<SyncResult> => {
  try {
    console.log("🚀 Starting scheduled course synchronization...");
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
      `🎉 Scheduled course synchronization completed successfully in ${duration}s`,
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
    console.error("❌ Error during scheduled course synchronization:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

export const startScheduledSync = (
  cronPattern: string = "0 0 * * *",
  semester: string = "11410",
) => {
  console.log(
    `📅 Starting scheduled sync with pattern: ${cronPattern} for semester: ${semester}`,
  );

  // Run every day at 8:00 AM
  // 8 AM (GMT+8) = 0 AM (GMT)
  const job = schedule.scheduleJob(cronPattern, async () => {
    console.log("⏰ Scheduled sync triggered");
    const result = await syncCourseData(semester);

    if (result.success) {
      console.log("✅ Scheduled sync completed successfully");
      if (result.stats) {
        console.log(`📊 Stats:`, result.stats);
      }
    } else {
      console.error("❌ Scheduled sync failed:", result.error?.message);
    }
  });

  console.log(`⏰ Scheduled job created. Next run: ${job.nextInvocation()}`);

  // Handle graceful shutdown
  const gracefulShutdown = () => {
    console.log("🛑 Received shutdown signal, cancelling scheduled job...");
    job.cancel();
    console.log("✅ Scheduled job cancelled. Exiting...");
    process.exit(0);
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  return job;
};

export { syncCourseData };
export default startScheduledSync;

// If this file is run directly, start the scheduled sync
if (require.main === module) {
  const cronPattern = process.argv[2] || "0 0 * * *";
  const semester = process.argv[3] || "11410";

  console.log(`Starting scheduled sync:`);
  console.log(`  Cron pattern: ${cronPattern}`);
  console.log(`  Semester: ${semester}`);

  startScheduledSync(cronPattern, semester);

  // Keep the process alive
  console.log("🔄 Scheduled sync service is running. Press Ctrl+C to stop.");
}
