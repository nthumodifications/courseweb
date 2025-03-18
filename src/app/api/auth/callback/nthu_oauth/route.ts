import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // You might want to add additional parameters to the URL
  // For example, a client_id, state, or redirect_uri
  const redirectUrl = "https://auth.nthumods.com/oauth/nthu";

  return NextResponse.redirect(redirectUrl);
}
