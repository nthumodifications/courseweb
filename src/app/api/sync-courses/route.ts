import {
  scrapeArchivedCourses,
  scrapeSyllabus,
  syncCoursesToAlgolia,
} from "@/lib/scrapers/course";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV == "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const semester = "11320";

  console.log("syncing courses uwu");
  console.log("scraping archived courses");
  await scrapeArchivedCourses(semester);
  console.log("scraping syllabus");
  await scrapeSyllabus(semester);
  console.log("syncing to algolia");
  await syncCoursesToAlgolia(semester);
  console.log("finish syncing to algolia");

  return NextResponse.json({ status: 200, body: { message: "success" } });
};
