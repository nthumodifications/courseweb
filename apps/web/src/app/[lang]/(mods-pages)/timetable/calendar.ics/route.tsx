// Redirect to the backend API which handles ICS generation directly.
// 301 ensures calendar apps that have the old URL bookmarked follow through.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = new URL("https://api.nthumods.com/timetable/calendar.ics");
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));
  return Response.redirect(targetUrl.toString(), 301);
}
