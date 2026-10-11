import { Hono } from "hono";
import { fetchUpstream } from "./utils/upstream";

const DINING_API_URL = "https://api.nthusa.tw/dining/";
const DINING_REQUEST_TIMEOUT_MS = 8_000;
const DINING_CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";

const app = new Hono().get("/", async (c) => {
  try {
    const upstreamResponse = await fetchUpstream(DINING_API_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(DINING_REQUEST_TIMEOUT_MS),
    });

    const body = await upstreamResponse.clone().text();
    try {
      JSON.parse(body);
    } catch {
      console.error("Dining API returned an unparseable body");
      return c.json({ error: "Dining service is unavailable" }, 502);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": DINING_CACHE_CONTROL,
        "Content-Type":
          upstreamResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to fetch dining data", error);
    return c.json({ error: "Dining service is unavailable" }, 502);
  }
});

export default app;
