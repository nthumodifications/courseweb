import { signInToCCXP } from "@/lib/headless_ais";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get("studentid");
    const password = form.get("password");

    if(!studentid || !password) return NextResponse.json({ error: { message: "Missing Student ID and Password" }}, { status: 400 })
    const res = await signInToCCXP(studentid as string, password as string)
    if(!res) {
        return NextResponse.json({ error: { message: "Something went wrong" }}, { status: 500 });
    }
    return NextResponse.json(res);
}