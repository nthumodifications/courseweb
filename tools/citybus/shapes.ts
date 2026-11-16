// Fetches route geometry for the city bus map. One city-wide TDX call covers
// every Hsinchu route (TDX allows only 5 calls a minute), and the result is
// written as small static files so the map never needs a live request.
//
//   TDX_CLIENT_ID=... TDX_CLIENT_SECRET=... bun tools/citybus/shapes.ts
import { mkdir } from "node:fs/promises";
import staticData from "../../services/api/src/citybus/data.json";
import { simplifyLine, type LatLon } from "./shapes-lib";

const TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const SHAPE_URL =
  "https://tdx.transportdata.tw/api/basic/v2/Bus/Shape/City/Hsinchu?$format=JSON";
const OUT_DIR = "apps/web/public/fallback_data/citybus/shapes";

interface TdxShape {
  SubRouteUID?: string;
  Geometry?: string;
}

function parseLineString(geometry: string): LatLon[] {
  // TDX uses WKT with "lon lat" order, e.g. LINESTRING(120.97 24.80, ...)
  const body = geometry
    .slice(geometry.indexOf("("))
    .replace(/[()A-Z\s]+$/g, "");
  return body
    .replace(/^\(+/, "")
    .split(",")
    .map((pair) => pair.trim().split(/\s+/).map(Number))
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(([lon, lat]) => [lat, lon] as LatLon);
}

const clientId = process.env.TDX_CLIENT_ID;
const clientSecret = process.env.TDX_CLIENT_SECRET;
if (!clientId || !clientSecret)
  throw new Error("Set TDX_CLIENT_ID and TDX_CLIENT_SECRET");

const tokenResponse = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }),
});
if (!tokenResponse.ok) throw new Error(`Token failed: ${tokenResponse.status}`);
const { access_token: token } = (await tokenResponse.json()) as {
  access_token: string;
};

const shapeResponse = await fetch(SHAPE_URL, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
if (!shapeResponse.ok) throw new Error(`Shape failed: ${shapeResponse.status}`);
const shapes = (await shapeResponse.json()) as TdxShape[];
const bySubRoute = new Map(
  shapes.flatMap((shape) =>
    shape.SubRouteUID && shape.Geometry
      ? [[shape.SubRouteUID, parseLineString(shape.Geometry)] as const]
      : [],
  ),
);

await mkdir(OUT_DIR, { recursive: true });
let written = 0;
let missing = 0;
for (const route of staticData.routes) {
  if (route.source !== "city") continue;
  const out: Record<string, LatLon[]> = {};
  for (const direction of route.directions) {
    const line = bySubRoute.get(direction.id);
    if (!line || line.length < 2) {
      missing += 1;
      console.warn(`No shape for ${route.id} ${direction.id}`);
      continue;
    }
    out[direction.id] = simplifyLine(line);
  }
  await Bun.write(
    `${OUT_DIR}/${encodeURIComponent(route.id)}.json`,
    `${JSON.stringify(out)}\n`,
  );
  written += 1;
}
console.log(
  `Wrote ${written} route shape files, ${missing} directions missing`,
);
