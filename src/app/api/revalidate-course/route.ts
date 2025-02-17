import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  revalidatePath("/[lang]/(mods-pages)/@modal/courses/[courseId]", "page");
  revalidatePath("/[lang]/(mods-pages)/courses/[courseId]", "page");
  return NextResponse.json({ status: 200, body: { message: "success" } });
};
