import { refreshUserSession, signInToCCXP } from "@/lib/headless_ais";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get("studentid");
    const encryptedPassword = form.get("encryptedPassword");

    if(!studentid || !encryptedPassword) return NextResponse.json({ error: { message: "Missing Student ID and Password" }}, { status: 400 })
    const res = await refreshUserSession(studentid as string, encryptedPassword as string);
    if(!res) {
        return NextResponse.json({ error: { message: "Something went wrong" }}, { status: 500 });
    }
    return NextResponse.json(res);
}