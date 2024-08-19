import supabase from "@/config/supabase";
import supabase_server from "@/config/supabase_server";
import { departments } from "@/const/departments";
import { signInToCCXP } from "@/lib/headless_ais";
import {
  getHiddenCourseSelectionCode,
  getLatestCourseEnrollment,
} from "@/lib/headless_ais/courses";
import { writeFileSync } from "fs";
import { readFile } from "fs/promises";
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

  const user = await signInToCCXP(
    process.env.DONER_STUDENTID!,
    process.env.DONER_PASSWORD!,
  );

  if ("error" in user) {
    throw new Error(user.error.message);
  }

  const { ACIXSTORE } = user;

  // const courses = await getHiddenCourseSelectionCode(ACIXSTORE, 'EE');

  const courses = (
    await Promise.all(
      departments.map(async (dept) =>
        (await getHiddenCourseSelectionCode(ACIXSTORE, dept.code)).filter(
          (course) => !!course,
        ),
      ),
    )
  )
    .flat()
    .filter((course) => course != null) as {
    ckey: string;
    code: string;
    div: string;
    real: string;
    cred: string;
    ctime: string;
    num: string;
    glimit: string;
    type: string;
    pre: string;
    range: string;
  }[];

  const semester = courses[0].ckey.slice(0, 5);

  const { data } = await supabase_server
    .from("courses")
    .select("raw_id")
    .eq("semester", semester);

  if (!data) throw new Error("failed to fetch data from supabase");

  const { error } = await supabase_server
    .from("course_hidden")
    .upsert(
      courses.filter((course) => !data.some((d) => d.raw_id == course.ckey)),
    );

  if (error) console.error(error);

  return NextResponse.json(courses);
};
