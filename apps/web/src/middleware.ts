import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator, { Headers } from "negotiator";
import { cookies } from "next/headers";

let locales = ["en", "zh"];

// Get the preferred locale, similar to the above or using a library
function getLocale(request: NextRequest) {
  //@ts-ignore
  let languages = new Negotiator({ headers: request.headers }).languages(
    locales,
  );
  let defaultLocale = "zh";

  return match(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) return;

  //check if cookies('locale') exists
  const cookieLocale = cookies().get("locale")?.value;

  if (cookieLocale && locales.includes(cookieLocale)) {
    request.nextUrl.pathname = `/${cookieLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Redirect if there is no locale
  const locale = getLocale(request);

  request.nextUrl.pathname = `/${locale}${pathname}`;
  // e.g. incoming request is /products
  // The new URL is now /en-US/products
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    // '/((?!_next|public|favicon.ico|manifest.json|manifest.webmanifest|icon.png).*)',
    //skip all paths in /pub
    // '/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)',
    // Optional: only run on root (/) URL
    // '/'
    "/",
    "/issues/:path*",
    "/contribute/:path*",
    "/team/:path*",
    "/privacy-policy/:path*",
    "/proxy-login/:path*",
    "/bus/:path*",
    "/courses/:path*",
    "/settings/:path*",
    "/timetable/:path*",
    "/today/:path*",
    "/calendar/:path*",
    "/venues/:path*",
    "/cds/:path*",
    "/apps/:path*",
    "/student/:path*",
    "/ais-redirect/:path*",
    "/shops/:path*",
  ],
};
