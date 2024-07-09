import { signInToCCXP } from "@/lib/headless_ais";
import { NextRequest, NextResponse } from "next/server";
import {cookies} from 'next/headers';

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
    
    await cookies().set('accessToken', res.accessToken, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'strict', secure: true });
    return NextResponse.json(res);
}