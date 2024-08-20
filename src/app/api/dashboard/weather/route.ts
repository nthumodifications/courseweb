import { NextRequest, NextResponse } from "next/server";
import { getWeatherData } from "@/lib/weather";

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
  const weatherData = await getWeatherData();

  return NextResponse.json(weatherData);
};
