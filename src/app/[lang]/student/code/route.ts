import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

export const GET = async (req: NextRequest) => {
    const session = await getServerSession(authConfig);

    if(session == null || !session.user || !session.user.inschool) return redirect('/');

    //payload
    const payload = {
        id: session.user.id,
        name_zh: session.user.name_zh,
        name_en: session.user.name_en,
        email: session.user.email,
    }

    const privateKey = process.env.STUDENT_ID_PRIVATE_KEY?.replaceAll('\\n', '\n') ?? '';
    const publicKey = process.env.STUDENT_ID_PUBLIC_KEY?.replaceAll('\\n', '\n') ?? '';

    const i = 'NTHUMods';
    const s = 'nthumods@googlegroups.com';
    const a = 'https://nthumods.com/';

    let signOptions = {
        issuer:  i,
        subject:  s,
        audience:  a,
        expiresIn:  "5m",
        algorithm:  "RS256"
    } as jwt.SignOptions;

    const token = jwt.sign(payload, privateKey, signOptions);

    return NextResponse.json({ token: token })
}