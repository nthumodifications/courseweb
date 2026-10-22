# CCXP timetable import URL

`ccxp-lite` can hand a student’s selected CCXP courses to NTHUMods without sending CCXP credentials to NTHUMods servers.

## URL

```text
https://nthumods.com/<lang>/timetable/view?semester_<semester>=<id1>,<id2>,...&source=ccxp
```

- `<lang>` is `zh`, `zh-cn`, or `en`.
- `source=ccxp` selects the CCXP import experience. It must be exactly `ccxp`; other values are treated as if `source` were absent.
- `<semester>` is a five-digit semester ID ending in `10` or `20`, such as `11510` or `11420`.
- Course IDs are comma-separated, trimmed, and de-duplicated within each semester. URL-encode spaces and other reserved characters.
- Multiple `semester_<semester>` parameters are supported. The page initially shows the latest supplied semester; the semester switcher lets the student review the others.

## Course ID formats

The preferred format is the CCXP course number, for example:

```text
11510CS 535100
```

The importer also accepts the same number with repeated or absent whitespace between the department and six-digit course number, and with lowercase department letters. NTHUMods normalizes these forms before matching them to its `raw_id` values, including database IDs with padding such as `11510CS  390100`.

An ID must contain a five-digit semester, a two-to-six-letter department, and a six-digit course number. IDs with a different semester from their `semester_` parameter, malformed IDs, and IDs not found in NTHUMods are shown on the page with an explanation and are never silently stored.

The import is capped at 60 course IDs across the URL. IDs beyond the cap are listed as not imported.

## What the page does

The page fetches course details from the public NTHUMods course API, previews the selected semester, and shows the change before writing anything:

- **Merge into my timetable** adds missing courses and keeps courses already in that semester.
- **Replace this semester** uses the imported courses for that semester and reports how many existing courses will be removed.

Both actions use the existing browser timetable storage/import path. Unknown or malformed IDs are not written. The extension does not need to authenticate to NTHUMods or send CCXP credentials.

## Backwards compatibility

URLs without `source=ccxp` retain the existing shared-timetable behavior. Any other `source` value is also treated as absent, so existing share links and their query format remain unchanged.
