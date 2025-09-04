/**
 * @fileoverview
 * One-time course synchronization script
 * Syncs archived courses, syllabus data, and Algolia search index
 */

export const syncCourses = async (semester: string = "11320") => {
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

export default syncCourses;

// If this file is run directly, execute the sync
if (require.main === module) {
  syncCourses();
}
