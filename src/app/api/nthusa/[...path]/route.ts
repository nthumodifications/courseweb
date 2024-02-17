import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const path = req.nextUrl.pathname.replace('/api/nthusa/', '');
    const searchParams = req.nextUrl.searchParams.toString();
    
    const res = await fetch(`https://api.nthusa.tw/${path}?${searchParams}`);
    const data = await res.json();
    return NextResponse.json(data);
}