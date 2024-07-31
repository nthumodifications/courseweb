import { NextRequest, NextResponse } from "next/server";

import { scrapeArchivedCourses } from "@/lib/scrapers/course";



export const GET = async (request: NextRequest, _try = 0) => {
    const authHeader = request.headers.get('authorization');

    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = request.nextUrl.searchParams.get('semester');

    if(!semester) throw new Error('semester is required');

    await scrapeArchivedCourses(semester);

    return NextResponse.json({ status: 200, body: { message: 'success' } })

}