import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import staticDataJson from "./data.json";
import {
  findCityBusDirection,
  findCityBusStop,
  getNextScheduledDepartures,
  getScheduleStatus,
  normalizeTdxEtas,
} from "./logic";
import type {
  CityBusDeparturesResponse,
  CityBusRoutesResponse,
  CityBusStaticData,
  CityBusStaticDirection,
  CityBusStaticRoute,
  TdxEtaRecord,
} from "./types";

interface CityBusBindings {
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
}

const staticData = staticDataJson as unknown as CityBusStaticData;
const TDX_BASE_URL = "https://tdx.transportdata.tw/api/basic/v2/Bus";
const TDX_TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const responseCache = new Map<
  string,
  { expiresAt: number; value: TdxEtaRecord[] }
>();
let tokenCache: { accessToken: string; expiresAt: number } | undefined;

function publicRoutes(): CityBusRoutesResponse {
  return {
    routes: staticData.routes.map((route) => ({
      id: route.id,
      source: route.source,
      category: route.category,
      nameZh: route.nameZh,
      nameEn: route.nameEn,
      ...(route.timesUrl ? { timesUrl: route.timesUrl } : {}),
      directions: route.directions.map((direction) => ({
        id: direction.id,
        labelZh: direction.labelZh,
        labelEn: direction.labelEn,
        destinationZh: direction.destinationZh,
        destinationEn: direction.destinationEn,
        campusStops: direction.stops
          .filter((stop) => stop.nearCampus)
          .map((stop) => ({
            id: stop.id,
            nameZh: stop.nameZh,
            nameEn: stop.nameEn,
          })),
      })),
      stopNamesZh: [
        ...new Set(
          route.directions.flatMap((direction) =>
            direction.stops.map((stop) => stop.nameZh),
          ),
        ),
      ],
      stopNamesEn: [
        ...new Set(
          route.directions.flatMap((direction) =>
            direction.stops.map((stop) => stop.nameEn),
          ),
        ),
      ],
    })),
  };
}

async function getTdxAccessToken(env: CityBusBindings = {}) {
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) return undefined;
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(TDX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.TDX_CLIENT_ID,
      client_secret: env.TDX_CLIENT_SECRET,
    }),
  });
  if (!response.ok) {
    throw new Error(`TDX token request failed with ${response.status}`);
  }

  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token)
    throw new Error("TDX token response had no access token");
  tokenCache = {
    accessToken: token.access_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in ?? 1800) * 1000,
  };
  return token.access_token;
}

async function fetchTdxEtas(
  route: CityBusStaticRoute,
  direction: CityBusStaticDirection,
  token: string,
): Promise<TdxEtaRecord[]> {
  const url = `${TDX_BASE_URL}/EstimatedTimeOfArrival/${route.source === "city" ? "City/Hsinchu" : "InterCity"}/${encodeURIComponent(route.tdxRouteName)}?$top=1000&$format=JSON`;
  const cached = responseCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new Error(`TDX ETA request failed with ${response.status}`);
  const value = (await response.json()) as TdxEtaRecord[];
  responseCache.set(url, { expiresAt: Date.now() + 30_000, value });
  return value.filter(
    (record) => !record.SubRouteUID || record.SubRouteUID === direction.id,
  );
}

const app = new Hono<{ Bindings: CityBusBindings }>()
  .get("/routes", (c) => {
    return c.json(publicRoutes(), 200, {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    });
  })
  .get(
    "/departures",
    zValidator(
      "query",
      z.object({
        route_id: z.string().min(1),
        direction_id: z.string().min(1).optional(),
        stop_id: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(10).optional(),
      }),
    ),
    async (c) => {
      const {
        route_id,
        direction_id,
        stop_id,
        limit = 5,
      } = c.req.valid("query");
      const route = staticData.routes.find((item) => item.id === route_id);
      if (!route) return c.json({ error: "Unknown city bus route" }, 404);
      const direction =
        (direction_id && findCityBusDirection(route, direction_id)) ??
        route.directions.find((item) =>
          item.stops.some((stop) => stop.id === stop_id),
        );
      if (!direction)
        return c.json({ error: "Unknown city bus direction" }, 404);
      const stop = findCityBusStop(route, direction.id, stop_id);
      if (!stop) return c.json({ error: "Unknown city bus stop" }, 404);

      let departures = getNextScheduledDepartures(
        route,
        direction.id,
        stop.id,
        new Date(),
        limit,
      );
      const status = getScheduleStatus(
        route,
        direction.id,
        stop.id,
        new Date(),
      );
      let realtime = false;
      const token =
        c.env?.TDX_CLIENT_ID && c.env?.TDX_CLIENT_SECRET
          ? await getTdxAccessToken(c.env).catch((error) => {
              console.error(
                "TDX authentication unavailable; using static city bus data",
                error,
              );
              return undefined;
            })
          : undefined;

      if (token) {
        try {
          const records = await fetchTdxEtas(route, direction, token);
          const etas = normalizeTdxEtas(
            records.filter((record) => record.StopUID === stop.id),
            new Date(),
            limit,
          );
          if (etas.length > 0) {
            departures = etas;
            realtime = true;
          }
        } catch (error) {
          console.error(
            "TDX ETA unavailable; using static city bus data",
            error,
          );
        }
      }

      const body: CityBusDeparturesResponse = {
        source: staticData.source,
        routeId: route.id,
        directionId: direction.id,
        stopId: stop.id,
        realtime,
        status: realtime ? "scheduled" : status,
        departures,
      };
      return c.json(body, 200, {
        "Cache-Control": realtime
          ? "public, max-age=10, s-maxage=30, stale-while-revalidate=60"
          : "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      });
    },
  );

export default app;
