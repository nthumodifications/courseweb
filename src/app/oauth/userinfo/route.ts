import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const auth = req.headers.get("Authorization")?.replace('Bearer ', '');
    return NextResponse.json({ 
        id: "111060062",
        name: "王小明",        
    }, { status: 200 });
}