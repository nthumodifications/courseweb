import { getAlerts } from "@/lib/alerts";
import { NextRequest, NextResponse } from "next/server";

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
  const alerts = await getAlerts();

  return NextResponse.json(alerts);
};
