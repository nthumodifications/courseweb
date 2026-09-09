# NTHU campus map data pipeline

This development-time tool downloads OpenStreetMap data for the NTHU main campus and converts it into the compact static file consumed by the web map.

```bash
bun run map:generate
```

The browser never calls Overpass. The generated output is written to `apps/web/public/data/nthu-main-campus.json` and is fetched only when a user opens the campus map route.

The query covers the main campus and includes building footprints, major roads, pedestrian paths, water areas, and the university boundary when available. Building identity is resolved against `packages/shared/src/campus/buildings.ts`; unknown OSM buildings are retained for visual context but are not assigned a CourseWeb venue identity.

OSM multipolygon outer rings are emitted as separate map features. Inner rings are assigned to their containing outer ring so courtyards and islands remain open in the rendered geometry. Nested relation members and malformed, unclosed rings are intentionally outside this campus-specific pipeline's scope.

Data source: [OpenStreetMap](https://www.openstreetmap.org/copyright), available under the [Open Database License](https://opendatacommons.org/licenses/odbl/).
