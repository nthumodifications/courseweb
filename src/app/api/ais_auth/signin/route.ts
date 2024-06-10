import { signInToCCXP } from "@/lib/headless_ais";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get("studentid");
    const password = form.get("password");

    if(!studentid || !password) return NextResponse.json({ error: { message: "Missing Student ID and Password" }}, { status: 400 })

    return NextResponse.json(await signInToCCXP(studentid as string, password as string));
}