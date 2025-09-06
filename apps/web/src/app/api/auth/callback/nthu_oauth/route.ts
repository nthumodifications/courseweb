import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // You might want to add additional parameters to the URL
  // For example, a client_id, state, or redirect_uri
  const redirectUrl = new URL("https://auth.nthumods.com/oauth/nthu");
  // Extract query parameters from the OAuth callback
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code"); // Authorization code
  const state = searchParams.get("state"); // Optional state parameter
  const error = searchParams.get("error"); // Optional error parameter

  if (code) redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);
  if (error) redirectUrl.searchParams.set("error", error);

  // Perform a server-side redirect (HTTP 302)
  return NextResponse.redirect(redirectUrl.toString());
}
