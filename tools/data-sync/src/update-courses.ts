/**
 * @fileoverview
 * Scheduled course synchronization script
 * Runs course sync on a daily schedule (8:00 AM GMT+8)
 */

import schedule from "node-schedule";

const syncCourseData = async (semester: string = "11320") => {
  try {
    console.log("syncing courses begin uwu");
    const res = await fetch(
      `http://localhost:3000/api/scrape-archived-courses?semester=${semester}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 minutes
      },
    );
    const res2 = await fetch(
      `http://localhost:3000/api/scrape-syllabus?semester=${semester}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        signal: AbortSignal.timeout(20 * 60 * 1000), // 20 minutes
      },
    );
    const res3 = await fetch(
      `http://localhost:3000/api/sync-algolia?semester=${semester}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      },
    );
    console.log("syncing courses end uwu");
    return { success: true, responses: [res, res2, res3] };
  } catch (e) {
    console.error("error calling scrape-courses", e);
    return { success: false, error: e };
  }
};

export const startScheduledSync = (
  cronPattern: string = "0 0 * * *",
  semester: string = "11320",
) => {
  // Run every day at 8:00 AM
  // 8 AM (GMT+8) = 0 AM (GMT)
  const job = schedule.scheduleJob(cronPattern, () => syncCourseData(semester));

  // handle close job
  process.on("SIGINT", () => {
    job.cancel();
    process.exit();
  });

  return job;
};

export { syncCourseData };
export default startScheduledSync;

// If this file is run directly, start the scheduled sync
if (require.main === module) {
  startScheduledSync();
}
