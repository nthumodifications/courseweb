import { departments } from "@/const/departments";
import { signInToCCXP } from "@/lib/headless_ais";
import { getLatestCourseEnrollment } from "@/lib/headless_ais/courses";
import { readFileSync, writeFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import supabase_server from "@/config/supabase_server";

export const GET = async (request: NextRequest) => {
  const semester = request.nextUrl.searchParams.get("semester");
  if (!semester) {
    return NextResponse.json({
      sucesss: false,
      message: "Semester not provided",
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

  const res = await fetch(
    "https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.7/JH727001.php?ACIXSTORE=" +
      ACIXSTORE,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "frame",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
      cache: "no-cache",
    },
  );

  const html = await res.text();
  if (html.includes("The system is not available now.")) {
    return NextResponse.json({
      sucesss: false,
      message: "Not in course selection period",
    });
  }

  const courses = (
    await Promise.all(
      departments.map(
        async (dept) => await getLatestCourseEnrollment(ACIXSTORE, dept.code),
      ),
    )
  ).flat();

  const dedupedCourses = courses.filter(
    (course, index, self) =>
      index === self.findIndex((t) => t!.courseNumber === course!.courseNumber),
  );

  // chunk by 1000 courses
  const chunked = dedupedCourses.reduce(
    (acc, cur, i) => {
      const index = Math.floor(i / 1000);
      acc[index] = acc[index] || [];
      acc[index].push(cur);
      return acc;
    },
    [] as Awaited<ReturnType<typeof getLatestCourseEnrollment>>[],
  );

  // for each chunk, update supabase
  for (const chunk of chunked) {
    const { error } = await supabase_server.from("course_enroll_stats").upsert(
      chunk.map((m) => ({
        raw_id: m!.courseNumber,
        limit: m!.sizeLimit == "無限制" ? null : parseInt(m!.sizeLimit),
        confirmed: parseInt(m!.currentNumber),
        waiting: parseInt(m!.toBeRandomed),
        remaining:
          m!.sizeLimit == "無限制"
            ? null
            : parseInt(m!.sizeLimit) - parseInt(m!.currentNumber),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "raw_id" },
    );

    console.error(error);
  }

  await kv.set("ENROLL_STATUS_SYNCED_ON", new Date().toISOString());
  return NextResponse.json({ sucesss: true });
};
