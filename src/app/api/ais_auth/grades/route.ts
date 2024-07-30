import { getStudentGrades } from "@/lib/headless_ais/grades";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export const POST = async (req: NextRequest) => {
    const { ACIXSTORE } = await req.json();

    const res = await getStudentGrades(ACIXSTORE);
    if(!res) {
        return NextResponse.json({ error: { message: "Something went wrong" }}, { status: 500 });
    }
    return NextResponse.json(res);
}