import schedule from "node-schedule";

// Run every day at 8:00 AM
// 8 AM (GMT+8) = 0 AM (GMT)
const job = schedule.scheduleJob("0 0 * * *", async () => {
  try {
    console.log("syncing courses begin uwu");
    const res = await fetch(
      "http://localhost:8080/api/scrape-archived-courses?semester=11310",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 minutes
      },
    );
    const res2 = await fetch(
      "http://localhost:8080/api/scrape-syllabus?semester=11310",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        signal: AbortSignal.timeout(20 * 60 * 1000), // 20 minutes
      },
    );
    const res3 = await fetch(
      "http://localhost:8080/api/sync-algolia?semester=11310",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      },
    );
    console.log("syncing courses end uwu");
  } catch (e) {
    console.error("error calling scrape-courses", e);
  }
});

// handle close job
process.on("SIGINT", () => {
  job.cancel();
  process.exit();
});
