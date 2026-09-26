# Campus building models

Building footprints, courtyards, identities and label groups come from `public/data/nthu-main-campus.json`. `buildingModels.ts` adds source-ID-based landmark profiles; `buildingGeometry.ts` generates and spatially batches the geometry. Changing a displayed name or label number does not change its model.

## Reference data

| Building         | Verified information                                        | Source                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MXIC             | Four-storey oval front, seven-storey rear                   | [NTHU Library, pp. 2 and 7](https://archives.lib.nthu.edu.tw/history/timeline/doc/20130411.pdf)                                                                              |
| Delta            | Nine storeys; red entrance wall and glazed facade           | [NTHU announcement](https://www.nthu.edu.tw/hotNews/content/664), [campus guide and photograph](https://attractions.site.nthu.edu.tw/p/406-1515-187035,r8697.php?Lang=zh-tw) |
| Engineering I    | Nine storeys; pale red exterior and horizontal window bands | [NTHU campus guide and photographs](https://attractions.site.nthu.edu.tw/p/406-1515-187020,r8697.php?Lang=en)                                                                |
| General II       | Eight storeys                                               | [NTHU Library, p. 6](https://archives.lib.nthu.edu.tw/history/timeline/doc/20130411.pdf)                                                                                     |
| EECS / C. L. Liu | Eight storeys; exterior renovated in 2024                   | [NTHU campus survey](https://gencom.site.nthu.edu.tw/p/406-1344-7306,r868.php?Lang=zh-tw), [renovation announcement](https://www.nthu.edu.tw/hotNews/content/1173)           |

These are map-scale reconstructions, not surveyed architectural models. OSM heights take priority, then OSM levels, then verified levels. Where only levels are known, height is estimated at 3.4 m per storey. Unverified buildings retain the existing 12 m fallback. Facade spacing, glass, roof coping and colour samples are illustrative; terrain elevation and interiors are not modelled. Reference photos are not downloaded by the application.

MXIC is split at the two neck vertices in the existing outline, preserving its total footprint. The split is an approximation derived from that outline. A coordinate guard falls back to the unsplit building if OSM changes those vertices; review this profile when regenerating the source data.

## Mobile budget

- One shared diffuse material and 220 m spatial tiles. Courtyards remain open; triangle ranges preserve individual building picking and grouped selection.
- 112 buildings: 22 batches, 6,992 triangles, 1,258,560 bytes of vertex attributes in the current dataset. No building textures, per-window meshes, shadow maps or postprocessing passes.
- Window patterns fade by distance and projected pixel size. Roof coping has actual geometry. Trees use two instanced draws.
- Touch DPR is capped at 1.25, or 1 on devices reporting at most 4 GB memory or 4 CPU threads. Gestures temporarily reduce DPR to 1, then restore it after camera damping settles. Desktop DPR is capped at 1.5.
- Demand rendering stops when the camera settles. One label overlay projects and declutters labels, with at most 24 on touch/limited devices and 40 on desktop. Selected buildings take priority; all buildings remain pickable.
- Geometry/material resources are disposed on unmount. No additional dependencies or map-data requests.

## Validation

From the repository root (PowerShell or a POSIX shell):

```sh
bun test apps/web/src/features/campusMap packages/shared/src/campus tools/map-data/src
bun run build:web
```

2026-09-26: 96 tests passed (~0.24 s); production build passed (~25 s). Tests cover courtyard raycasts with both ring windings, individual picking, group highlighting, MXIC proportions/outline changes, and geometry/label/device budgets.

Local Chromium at a 390 × 844 CSS viewport, DPR 3 emulation, same camera positions:

| View            | Draw calls before | Draw calls after |
| --------------- | ----------------: | ---------------: |
| Campus overview |                82 |               27 |
| Delta focus     |                38 |               18 |
| MXIC focus      |                29 |               17 |

The overview renders 15,844 triangles including all visible environment geometry (previously 11,934). The drawing buffer changes from 585 × 1050 to 487 × 875. Browser checks found no runtime/shader errors; settled idle rendering produced zero frames over one second, and touch dragging moved the camera without changing selection. These are desktop browser measurements with mobile emulation, not physical-phone FPS or battery measurements.

Map test type checking and ESLint with the root configuration pass. The normal web ESLint configuration currently references the nonexistent `@typescript-eslint/recommended` preset. Whole-web TypeScript checking has seven existing errors in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx` and `worker.ts`, outside the map.
