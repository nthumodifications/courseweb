# NTHU campus map data pipeline

This development-time tool downloads OpenStreetMap data for the NTHU main campus and converts it into the compact static file consumed by the web map.

```bash
bun run map:generate
```

The browser never calls Overpass. The generated output is written to `apps/web/public/data/nthu-main-campus.json` and is fetched only when a user opens the campus map route.

## Maintaining labels and exclusions

Edit `campus-map-curation.json` instead of the generated web data:

- `labels` contains only locations that appear on the map. Its `number` values are the visible `#1` through `#N` sequence. A grouped location has one label entry containing all of its OSM `featureIds` and `sourceIds`.
- `excludedSourceIds` is the permanent denylist. To remove a location, copy its stable `way/…` or `relation/…` value here and run `bun run map:generate`. The tool removes that source from `labels`, compacts the visible numbers, and updates `renamed` and `groups` references.
- `renamed` maps a current visible number to its bilingual display name. `groups` adds a shared identity and name to a merged multi-feature label.
- Run `bun run map:sync-labels` only after OpenStreetMap gains a new location. Excluded source IDs are never restored by synchronization.

Do not remove an unwanted location's entry from `excludedSourceIds`; without that source-ID tombstone, a later OpenStreetMap synchronization can add it again.

The query covers the main campus and includes building footprints, major roads, pedestrian paths, water areas, and the university boundary when available. Building identity is resolved against `packages/shared/src/campus/buildings.ts`; unknown OSM buildings are retained for visual context but are not assigned a CourseWeb venue identity.

OSM multipolygon outer rings are emitted as separate map features. Inner rings are assigned to their containing outer ring so courtyards and islands remain open in the rendered geometry. Nested relation members and malformed, unclosed rings are intentionally outside this campus-specific pipeline's scope.

Data source: [OpenStreetMap](https://www.openstreetmap.org/copyright), available under the [Open Database License](https://opendatacommons.org/licenses/odbl/).
