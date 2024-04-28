import { NextRequest, NextResponse } from "next/server";
import jws from 'jws';
import jwt from 'jsonwebtoken';
import { allowedClients } from "../allowedClients";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const searchParams = req.nextUrl?.searchParams;
    const auth = req.headers.get("Authorization")?.replace('Basic ', '');
    // conv from base64, into <client_id>:<client_secret>
    const [client_id, client_secret] = Buffer.from(auth ?? "", 'base64').toString().split(':');

    if (!allowedClients.find(c => c.id == client_id && c.client_secret == client_secret)) 
        return NextResponse.json({ status: 400, body: "Invalid client_id or client_secret" }, { status: 400 });

    const grant_type = form.get("grant_type") as string;
    const code = form.get("code") as string;
    if (!code) 
        return NextResponse.json({ status: 400, body: "Missing required parameters" }, { status: 400 });
    if(!jws.verify(code, 'HS256', process.env.NTHU_OAUTH_AUTH_CODE_SECRET ?? "")) return NextResponse.json({ status: 400, body: "Invalid code" }, { status: 400 });
    const decoded = jws.decode(code);
    if (!decoded) return NextResponse.json({ status: 400, body: "Invalid code" }, { status: 400 });

    const verifiedPayload = JSON.parse(decoded.payload);
    const payload = {
        id: verifiedPayload.studentid,
        pwd: verifiedPayload.password
    }

    const token = jwt.sign(payload, process.env.NTHU_OAUTH_ACCESS_TOKEN_SECRET ?? "", { expiresIn: '45d' });

    return NextResponse.json({ access_token: token, token_type: "Bearer", expires_in: 45 * 24 * 60 * 60, scope: verifiedPayload.scope }, { status: 200 });
}