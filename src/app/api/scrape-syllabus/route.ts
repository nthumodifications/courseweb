import supabase_server from "@/config/supabase_server";
import { NextRequest, NextResponse } from "next/server";
import iconv from 'iconv-lite';
import jsdom from 'jsdom';
import { scrapeSyllabus } from "@/lib/scrapers/course";

export const GET = async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV == 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    const semester = request.nextUrl.searchParams.get('semester');

    if(!semester) throw new Error('semester is required');
    
    await scrapeSyllabus(semester);
    
    return NextResponse.json({ message: 'success' }, { status: 200 });
}

