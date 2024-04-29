import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { allowedClients } from "../allowedClients";

export const GET = async (req: NextRequest) => {
    const searchParams = req.nextUrl?.searchParams;
    if (!searchParams) return NextResponse.json({ status: 400, body: "Missing required parameters" }, { status: 400 });
    const response_type = searchParams.get("response_type");
    const client_id = searchParams.get("client_id");
    const redirect_uri = searchParams.get("redirect_uri");
    const scope = searchParams.get("scope");
    const state = searchParams.get("state");


    if (response_type != "code") return NextResponse.json({ status: 400, body: "Invalid response_type" }, { status: 400 });
    if (!client_id || !redirect_uri || !scope || !state) return NextResponse.json({ status: 400, body: "Missing required parameters" }, { status: 400 });

    const client = allowedClients.find(c => c.id == client_id);
    if (!client) return NextResponse.json({ status: 400, body: "Invalid client_id" }, { status: 400 });
    if (!client.redirect_uris.includes(redirect_uri)) return NextResponse.json({ status: 400, body: "Invalid redirect_uri" }, { status: 400 });
    
    //check if scopes are valid 
    const scopes = scope.split(" ");
    if (!scopes.every(s => client.scopes.includes(s))) return NextResponse.json({ status: 400, body: "Invalid scope" }, { status: 400 });

    redirect(`/oauth/authorize?${req.nextUrl?.searchParams.toString()}`);
}