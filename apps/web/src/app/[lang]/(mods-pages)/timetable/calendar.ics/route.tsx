const CALENDAR_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": "attachment; filename=timetable.ics",
};

const EMPTY_CALENDAR =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NTHUMods//Timetable//EN\r\nX-WR-CALNAME:NTHUMods\r\nEND:VCALENDAR\r\n";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const apiBaseUrl = process.env.NEXT_PUBLIC_COURSEWEB_API_URL;
  if (!apiBaseUrl) {
    return new Response("Server misconfiguration", { status: 500 });
  }

  const targetUrl = new URL(`${apiBaseUrl}/timetable/calendar.ics`);
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  try {
    const res = await fetch(targetUrl.toString());

    if (!res.ok) {
      console.error(
        `Timetable ICS API returned ${res.status}: ${await res.text()}`,
      );
      return new Response(EMPTY_CALENDAR, {
        status: 200,
        headers: CALENDAR_HEADERS,
      });
    }

    return new Response(res.body, {
      status: 200,
      headers: CALENDAR_HEADERS,
    });
  } catch (e) {
    console.error("Failed to fetch timetable ICS from API:", e);
    return new Response(EMPTY_CALENDAR, {
      status: 200,
      headers: CALENDAR_HEADERS,
    });
  }
}
