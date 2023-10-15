import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator, { Headers } from 'negotiator'

let locales = ['en', 'zh']
 
// Get the preferred locale, similar to the above or using a library
function getLocale(request: NextRequest) { 
    //@ts-ignore
    let languages = new Negotiator({ headers: request.headers }).languages(locales)
    let defaultLocale = 'zh'
    
    return match(languages, locales, defaultLocale)
 }
 
export function middleware(request: NextRequest) {
  // Check if there is any supported locale in the pathname
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
 
  if (pathnameHasLocale) return
 
  // Redirect if there is no locale
  const locale = getLocale(request)
  // console.log(locale)
  request.nextUrl.pathname = `/${locale}${pathname}`
  // e.g. incoming request is /products
  // The new URL is now /en-US/products
  return NextResponse.redirect(request.nextUrl)
}
 
export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next).*)',
    // Optional: only run on root (/) URL
    // '/'
  ],
}
