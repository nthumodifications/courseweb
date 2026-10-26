import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import {
  getCampusBuildingIdentity,
  resolveVenueToCampusIdentity,
} from "@courseweb/shared";
import { decodeCcXpImportQuery } from "@/helpers/ccxpImport";
import { decodeTimetableShareQuery } from "@/helpers/timetableShare";
import { findCampusBusStopIndex } from "@/features/bus/campusBusStop";
import { linesDict } from "@/features/bus/campusBusLines";
import { normalizeBusTab } from "@/features/bus/busTab";
import { parseLibraryDeepLink } from "@/app/[lang]/(mods-pages)/library/deep-link";
import { resolveLaundryDeepLink } from "@/app/[lang]/(mods-pages)/laundry/deep-link";
import {
  resolveShopAreaDeepLink,
  SHOP_AREAS,
} from "@/app/[lang]/(mods-pages)/shops/deep-link";
import { parseYouBikeDeepLink } from "@/app/[lang]/(mods-pages)/youbike/deep-link";
import { parseSportsVenuesDeepLink } from "@/app/[lang]/(mods-pages)/sports-venues/deep-link";
import { parseAnnouncementsDeepLink } from "@/app/[lang]/(mods-pages)/announcements/deep-link";
import {
  getSectionIdFromHash,
  SETTINGS_SECTION_IDS,
  SETTINGS_SETTING_IDS,
} from "@/app/[lang]/(mods-pages)/settings/sectionHash";
import { parseCalendarDeepLink } from "@/components/Calendar/deep-link";
import {
  buildDeepLinksManifest,
  buildDeepLinksMarkdown,
  normalizeGeneratedText,
  resolveDeepLinkLineValues,
  resolveDeepLinkValues,
} from "../../../scripts/gen-deep-links";
import {
  DEEP_LINK_REGISTRY,
  INTERNAL_PARAMS,
  type DeepLinkParam,
} from "./registry";
import { extractDeepLinkParamNames } from "./guards";

const docsPath = new URL("../../../../../docs/deep-links.md", import.meta.url);
const jsonPath = new URL(
  "../../../public/data/deep-links.json",
  import.meta.url,
);

test("generated deep-link outputs are fresh", async () => {
  const committedMarkdown = await Bun.file(docsPath).text();
  const committedManifest = await Bun.file(jsonPath).json();

  if (
    normalizeGeneratedText(committedMarkdown) !==
    normalizeGeneratedText(buildDeepLinksMarkdown())
  ) {
    throw new Error("Deep-link docs are stale; run `bun run gen:deep-links`.");
  }
  if (
    JSON.stringify(committedManifest) !==
    JSON.stringify(buildDeepLinksManifest())
  ) {
    throw new Error("Deep-link JSON is stale; run `bun run gen:deep-links`.");
  }
  expect(normalizeGeneratedText(committedMarkdown)).toBe(
    normalizeGeneratedText(buildDeepLinksMarkdown()),
  );
  expect(committedManifest).toEqual(buildDeepLinksManifest());
});

test("freshness comparison treats CRLF and LF as the same generated text", () => {
  const generated = buildDeepLinksMarkdown();
  const crlf = generated.replaceAll("\n", "\r\n");
  expect(normalizeGeneratedText(crlf)).toBe(normalizeGeneratedText(generated));
});

test.each([
  [
    'const [query] = useSearchParams(); query.get("variable")',
    ["variable"],
  ],
  [
    'const [searchParams] = useSearchParams(); searchParams.getAll("all")',
    ["all"],
  ],
  [
    'const [searchParams] = useSearchParams(); const query = searchParams; query.has("hasvar")',
    ["hasvar"],
  ],
  ['new URLSearchParams(location.search).get("direct")', ["direct"]],
  [
    'const [query] = useSearchParams(); query.get("custom")',
    ["custom"],
  ],
  [
    'const params = new URLSearchParams(location.search); params.get("urlparam")',
    ["urlparam"],
  ],
])("the static scanner finds URLSearchParams form %s", (source, expected) => {
  expect(extractDeepLinkParamNames(source)).toEqual(expected);
});

test("hash reads stay outside the query-parameter coverage scan", () => {
  expect(extractDeepLinkParamNames('location.hash.includes("hash-section")')).toEqual(
    [],
  );
});

test("registry declares route-specific duplicate handling", () => {
  const duplicateHandling = Object.fromEntries(
    DEEP_LINK_REGISTRY.map((route) => [route.route, route.duplicates]),
  );
  expect(duplicateHandling).toEqual({
    "/bus": "ignored",
    "/bus/main/:line": "ignored",
    "/bus/nanda/:line": "ignored",
    "/bus/city/:route": "first-value",
    "/laundry": "ignored",
    "/library": "ignored",
    "/directory": "ignored",
    "/shops": "ignored",
    "/map": "first-value",
    "/youbike": "ignored",
    "/sports-venues": "ignored",
    "/calendar": "ignored",
    "/announcements": "ignored",
    "/settings": "first-value",
    "/reviews/past": "first-value",
    "/courses/modules": "first-value",
    "/courses/module/:moduleKey": "first-value",
    "/timetable/view": "first-value",
  });
});

test.each([
  ["/bus/main/:line", ["green", "red"]],
  [
    "/bus/nanda/:line",
    ["route1_up", "route1_down", "route2_up", "route2_down"],
  ],
])("line route %s publishes one stop group per line", (routeName, lineKeys) => {
  const route = DEEP_LINK_REGISTRY.find((item) => item.route === routeName);
  const param = route?.params.find((item) => item.name === "stop") as
    | (DeepLinkParam & { lineValues?: () => Readonly<Record<string, unknown>> })
    | undefined;
  expect(param?.lineValues && Object.keys(param.lineValues())).toEqual(lineKeys);
});

test("registry and emitted line examples are accepted values", () => {
  const markdown = buildDeepLinksMarkdown();
  const manifest = buildDeepLinksManifest();
  for (const route of DEEP_LINK_REGISTRY) {
    for (const param of route.params) {
      const values = resolveDeepLinkValues(param.values);
      if (Array.isArray(values)) expect(values).toContain(param.example);

      if (!param.lineValues) continue;
      for (const [line, lineValues] of Object.entries(
        resolveDeepLinkLineValues(param.lineValues),
      )) {
        if (!Array.isArray(lineValues)) {
          throw new Error(`Expected list values for ${route.route}:${line}`);
        }
        const row = markdown
          .split("\n")
          .find((candidate) =>
            candidate.startsWith(`| \`${param.name}:${line}\` |`),
          );
        const emittedExample = row?.match(/\| `([^`]*)` \|$/)?.[1];
        expect(emittedExample).toBeDefined();
        expect(lineValues).toContain(emittedExample);

        const manifestParam = manifest.routes
          .find((item) => item.route === route.route)
          ?.params.find((item) => item.name === param.name);
        const emittedJsonExample = manifestParam?.lineExamples?.[line];
        expect(emittedJsonExample).toBeDefined();
        expect(lineValues).toContain(emittedJsonExample);
      }
    }
  }
});

test("every URLSearchParams parameter is registered or explicitly internal", async () => {
  const srcRoot = fileURLToPath(new URL("../../", import.meta.url));
  const names = new Set<string>();
  const glob = new Bun.Glob("**/*.{ts,tsx}");
  for await (const relativePath of glob.scan({
    cwd: srcRoot,
    onlyFiles: true,
  })) {
    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (
      normalizedPath.includes(".test.") ||
      normalizedPath.includes("/admin/")
    ) {
      continue;
    }
    const source = await Bun.file(`${srcRoot}/${relativePath}`).text();
    for (const name of extractDeepLinkParamNames(source)) names.add(name);
  }

  const registered = new Set(
    DEEP_LINK_REGISTRY.flatMap((route) =>
      route.params
        .map((param) => param.name)
        .filter((name) => !name.startsWith("#")),
    ),
  );
  const missing = [...names].filter(
    (name) => !registered.has(name) && !(name in INTERNAL_PARAMS),
  );
  expect(missing).toEqual([]);
});

const resolveExample = (route: string, url: URL): unknown => {
  const params = url.searchParams;
  if (route === "/bus") {
    return {
      tab: normalizeBusTab(params.get("tab")),
      stop: params.get("stop") ?? null,
    };
  }
  if (route === "/bus/main/:line" || route === "/bus/nanda/:line") {
    const line = url.pathname.split("/").at(-1) ?? "";
    const lineData = linesDict[line];
    const index = lineData
      ? findCampusBusStopIndex(
          params.get("stop"),
          lineData.stations_zh,
          lineData.stations_en,
        )
      : undefined;
    return { line, stopIndex: index };
  }
  if (route === "/bus/city/:route") {
    return { direction: params.get("direction"), stop: params.get("stop") };
  }
  if (route === "/laundry") return resolveLaundryDeepLink(params, null);
  if (route === "/library") return parseLibraryDeepLink(params);
  if (route === "/directory") return {};
  if (route === "/shops") return resolveShopAreaDeepLink(params, SHOP_AREAS);
  if (route === "/map") {
    return {
      building: params.get("building")
        ? getCampusBuildingIdentity(params.get("building")!)
        : undefined,
      venue: params.get("venue")
        ? resolveVenueToCampusIdentity(params.get("venue")!)
        : undefined,
      feature: params.get("feature"),
    };
  }
  if (route === "/youbike") return parseYouBikeDeepLink(params);
  if (route === "/sports-venues") {
    const facility = params.get("facility");
    return parseSportsVenuesDeepLink(params, facility ? [facility] : []);
  }
  if (route === "/calendar") return parseCalendarDeepLink(params);
  if (route === "/announcements") {
    const source = params.get("source");
    return parseAnnouncementsDeepLink(params, source ? [source] : []);
  }
  if (route === "/settings") {
    return getSectionIdFromHash(
      url.hash,
      SETTINGS_SECTION_IDS,
      SETTINGS_SETTING_IDS,
    );
  }
  if (route === "/reviews/past") return { semester: params.get("semester") };
  if (route === "/courses/modules") return { query: params.get("q") };
  if (route === "/courses/module/:moduleKey")
    return { title: params.get("title") };
  if (route === "/timetable/view") {
    return params.get("source") === "ccxp"
      ? decodeCcXpImportQuery(params)
      : decodeTimetableShareQuery(params);
  }
  return null;
};

describe("registry examples", () => {
  for (const route of DEEP_LINK_REGISTRY) {
    for (const example of route.examples) {
      const runtime = route.params.some((param) => param.runtime);
      test(
        `${route.route} ${runtime ? "runtime-data format" : "example resolves"}: ${example}`,
        () => {
        const url = new URL(`https://nthumods.com${example}`);
        const state = resolveExample(route.route, url);
        if (runtime) {
          for (const param of route.params.filter((item) => item.runtime)) {
            const value = url.searchParams.get(param.name);
            expect(value).toMatch(
              param.name === "station"
                ? /^\d{9}$/
                : param.name === "direction" ||
                    param.name === "stop" ||
                    param.name === "source"
                  ? /^[A-Za-z0-9][A-Za-z0-9_-]*$/
                  : /\S+/,
            );
          }
          expect(state).toBeTruthy();
          return;
        }
        if (route.route === "/bus") {
          expect(state).toEqual({
            tab: url.searchParams.get("tab") === "nanda" ? "nanda" : "north_gate",
            stop: url.searchParams.get("stop") ?? null,
          });
          return;
        }
        if (route.route === "/bus/main/:line" || route.route === "/bus/nanda/:line") {
          const line = url.pathname.split("/").at(-1)!;
          const lineData = linesDict[line];
          expect(lineData).toBeDefined();
          expect(state).toEqual({
            line,
            stopIndex: findCampusBusStopIndex(
              url.searchParams.get("stop"),
              lineData!.stations_zh,
              lineData!.stations_en,
            ),
          });
          return;
        }
        if (route.route === "/laundry") {
          expect(state).toEqual({ dorm: "仁齋", area: "仁齋男" });
          return;
        }
        if (route.route === "/library") {
          expect(state).toEqual({ branch: "moonlight", category: "carrel" });
          return;
        }
        if (route.route === "/shops") {
          expect(state).toEqual(
            url.searchParams.has("area")
              ? { area: "風雲1樓" }
              : {
                  area: "",
                  areas: ["風雲1樓", "風雲2樓", "風雲3樓", "風雲4樓"],
                },
          );
          return;
        }
        if (route.route === "/map") {
          const resolved = state as {
            building?: { id: string };
            venue?: { id: string };
            feature?: string | null;
          };
          expect(resolved.building?.id ?? resolved.venue?.id).toBe("delta");
          expect(resolved.feature).toBeNull();
          return;
        }
        if (route.route === "/calendar") {
          expect(state).toEqual({ date: "2026-10-24", view: "month" });
          return;
        }
        if (route.route === "/settings") {
          expect(state).toBe(url.hash.slice(1));
          return;
        }
        if (route.route === "/reviews/past") {
          expect(state).toEqual({ semester: "11420" });
          return;
        }
        if (route.route === "/courses/modules") {
          expect(state).toEqual({ query: "computer" });
          return;
        }
        if (route.route === "/courses/module/:moduleKey") {
          expect(state).toEqual({ title: "Introduction to Computer Science" });
          return;
        }
        if (route.route === "/timetable/view") {
          const resolved = state as {
            initialSemester?: string;
            courseCodes?: Record<string, string[]>;
          };
          expect(resolved.initialSemester).toBe("11510");
          expect(resolved.courseCodes?.["11510"]).toEqual(["11510CS 535100"]);
          return;
        }
        expect(state).toBeTruthy();
      });
    }
  }
});
