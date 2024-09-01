import { NextRequest, NextResponse } from "next/server";
import { getNTHUCalendar } from "@/lib/calendar_event";

export const OPTIONS = (req: NextRequest) => {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "https://nthumods.com",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    },
  );
};

export const GET = async (req: NextRequest) => {
  const datas = await getNTHUCalendar(
    new Date(),
    new Date(Date.now() + 86400000 * 7),
  );

  return NextResponse.json(datas);
};
