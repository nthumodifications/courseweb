import { NextRequest, NextResponse } from "next/server";
import { syncCoursesToAlgolia } from "@/lib/scrapers/course";

export const GET = async (request: NextRequest) => {
  const semester = request.nextUrl.searchParams.get("semester");

  if (!semester) throw new Error("semester is required");

  await syncCoursesToAlgolia(semester);
  return NextResponse.json({ status: 200, body: { message: "success" } });
};
