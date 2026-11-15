/**
 * Persistent scheduled synchronization entrypoint. With no explicit semester,
 * each run resolves the active semester and probes upcoming CCXP terms.
 */

import schedule from "node-schedule";
import { runAutoSync } from "./auto-sync";
import { syncCourses } from "./sync-courses";
import type { SyncResult } from "./types";

export const syncCourseData = (semester?: string): Promise<SyncResult> =>
  semester ? syncCourses(semester) : runAutoSync({ syncSemester: syncCourses });

export const startScheduledSync = (
  cronPattern = "0 0 * * *",
  semester?: string,
) => {
  const selection = semester
    ? `semester ${semester}`
    : "automatic semester selection";
  console.log(
    `📅 Starting scheduled sync with pattern: ${cronPattern} (${selection})`,
  );

  const job = schedule.scheduleJob(cronPattern, async () => {
    console.log("⏰ Scheduled sync triggered");
    const result = await syncCourseData(semester);
    if (result.success) {
      console.log("✅ Scheduled sync completed successfully");
      if (result.stats) console.log("📊 Stats:", result.stats);
    } else {
      console.error("❌ Scheduled sync failed:", result.error?.message);
    }
  });

  console.log(`⏰ Scheduled job created. Next run: ${job.nextInvocation()}`);

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

export default startScheduledSync;

if (import.meta.main) {
  const cronPattern = process.argv[2] || "0 0 * * *";
  const semester = process.argv[3]?.trim() || undefined;
  console.log("Starting scheduled sync:");
  console.log(`  Cron: ${cronPattern}`);
  console.log(`  Selection: ${semester ?? "automatic"}`);
  startScheduledSync(cronPattern, semester);
  console.log("🔄 Scheduled sync service is running. Press Ctrl+C to stop.");
}
