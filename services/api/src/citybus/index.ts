import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import staticDataJson from "./data.json";
import {
  findCityBusDirection,
  findCityBusStop,
  getNextScheduledDepartures,
  getScheduleStatus,
} from "./logic";
import {
  buildCityBusEtaResponse,
  getCityBusRealtimeSnapshot,
  type CityBusEtaResponse,
} from "./realtime";
import type {
  CityBusDeparturesResponse,
  CityBusRoutesResponse,
  CityBusStaticData,
} from "./types";

interface CityBusBindings {
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
}

const staticData = staticDataJson as unknown as CityBusStaticData;

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

function responseHeaders() {
  return { "Cache-Control": "public, max-age=15" };
}

function emptyRealtimeResponse(
  routeId: string,
  directionId: string,
): CityBusEtaResponse {
  return {
    routeId,
    directionId,
    stops: [],
    buses: [],
    updatedAt: null,
    realtime: false,
  };
}

function formatTaipeiTime(value: string) {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function liveDeparture(
  liveStop: CityBusEtaResponse["stops"][number],
  now: Date,
) {
  if (liveStop.status === 3 || liveStop.status === 4) return [];
  if (liveStop.etaSeconds !== null) {
    const arrival = new Date(now.getTime() + liveStop.etaSeconds * 1000);
    return [
      {
        departureTime: formatTaipeiTime(arrival.toISOString()),
        minutes: Math.ceil(liveStop.etaSeconds / 60),
        realtime: true,
        arrivalAt: arrival.toISOString(),
        ...(liveStop.etaSeconds < 60 ? { status: "approaching" as const } : {}),
      },
    ];
  }
  if (liveStop.status === 1 && liveStop.nextBusTime) {
    return [
      {
        departureTime: formatTaipeiTime(liveStop.nextBusTime),
        realtime: true,
      },
    ];
  }
  return [];
}

const app = new Hono<{ Bindings: CityBusBindings }>()
  .get("/routes", (c) => {
    return c.json(publicRoutes(), 200, {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    });
  })
  .get(
    "/eta",
    zValidator(
      "query",
      z.object({
        route_id: z.string().min(1),
        direction_id: z.string().min(1),
      }),
    ),
    async (c) => {
      const { route_id, direction_id } = c.req.valid("query");
      const route = staticData.routes.find((item) => item.id === route_id);
      if (!route) return c.json({ error: "Unknown city bus route" }, 404);
      const direction = findCityBusDirection(route, direction_id);
      if (!direction)
        return c.json({ error: "Unknown city bus direction" }, 404);
      if (!c.env?.TDX_CLIENT_ID || !c.env?.TDX_CLIENT_SECRET) {
        return c.json(
          emptyRealtimeResponse(route.id, direction.id),
          200,
          responseHeaders(),
        );
      }
      const snapshot = await getCityBusRealtimeSnapshot(route, c.env);
      return c.json(
        snapshot
          ? buildCityBusEtaResponse(route, direction, snapshot)
          : emptyRealtimeResponse(route.id, direction.id),
        200,
        responseHeaders(),
      );
    },
  )
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
      const snapshot = await getCityBusRealtimeSnapshot(route, c.env);
      if (snapshot) {
        const eta = buildCityBusEtaResponse(route, direction, snapshot);
        const liveStop = eta.stops.find((item) => item.stopId === stop.id);
        const liveDepartures = liveStop
          ? liveDeparture(liveStop, new Date()).slice(0, limit)
          : [];
        if (
          liveStop &&
          (liveDepartures.length > 0 ||
            liveStop.status === 3 ||
            liveStop.status === 4)
        ) {
          departures = liveDepartures;
          realtime = true;
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
        ...responseHeaders(),
      });
    },
  );

export default app;
