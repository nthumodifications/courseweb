# NTHUMods deep links

Use `/zh/...` or `/en/...` as the language prefix. Query values must be URL-encoded. Bus, laundry, library, and shops parameters ignore unknown values. An unknown map `building` or `venue` shows a `not mapped` notice.

## Bus

| URL | Parameter | Accepted values / source | Example |
| --- | --- | --- | --- |
| `/<lang>/bus` | `tab` | `north_gate`, `tsmc`, `nanda`, `city` | `/zh/bus?tab=nanda` |
| `/<lang>/bus` | `stop` | A campus stop name in `stations_zh` or `stations_en` in the campus line page. Chinese matching trims whitespace; English matching also ignores case. Names include `北校門口`, `綜二`, `楓林小徑`, `奕園停車場`, `南門停車場`, `台積館`, `人社院/生科院`, `南大校區`, `台積館(經寶山路)`, `教育學院大樓/南門停車場(經寶山路)`, `North Main Gate`, `General Building II`, `Maple Path`, `Yi Pavilion Parking Lot`, `South Gate Parking Lot`, `TSMC Building`, `CHSS/CLS Building`, `Nanda Campus`, `TSMC Building(Baoshan Rd.)`, `COE Building/South Gate Parking Lot(Baoshan Rd.)`. | `/en/bus?tab=north_gate&stop=General%20Building%20II` |
| `/<lang>/bus/main/<line>` | `stop` | `line`: `red` or `green`; use the same campus stop names above. The line page scrolls to the matching stop without changing its live state. If a name occurs twice, the first occurrence not marked `LEFT` is selected; otherwise the first occurrence is selected. | `/zh/bus/main/green?stop=%E7%B6%9C%E4%BA%8C` |
| `/<lang>/bus/nanda/<line>` | `stop` | `line`: `route1_up`, `route1_down`, `route2_up`, or `route2_down`; use the station names for that line. | `/en/bus/nanda/route1_up?stop=TSMC%20Building%28Baoshan%20Rd.%29` |
| `/<lang>/bus/city/<route>` | `direction`, `stop` | Exact city-bus route IDs, direction IDs, and stop IDs from `apps/web/public/fallback_data/citybus/index.json` and its `routes/*.json` files. | `/zh/bus/city/83?direction=HSZ000801&stop=HSZ303582` |

On the campus catalogue, `stop` is carried from `/bus` to the selected campus line, which scrolls to the stop without adding a visual mark, and is preserved in `return_url`. Changing `tab` also preserves `stop`.

## Laundry

`/<lang>/laundry?dorm=<slug>&area=<areaKey>` selects the laundry context. A `dorm` value overrides the stored 我的宿舍 value; an `area` without `dorm` implies that area’s dorm.

| Parameter | Accepted values |
| --- | --- |
| `dorm` | `yi`, `ming`, `shyr`, `hsin`, `hua`, `li`, `cheng`, `ya`, `huei`, `jing`, `shuo`, `jen`, `tsinghua_hall` |
| `area` | `義齋`, `清華會館 9F`, `清華會館 B1`, `明齋`, `新齋`, `華齋`, `禮齋`, `實齋男`, `靜齋`, `碩齋`, `實齋女`, `慧齋`, `雅齋`, `誠齋`, `仁齋男`, `仁齋女` from `apps/web/src/const/laundry-machines.ts` |

Example: `/zh/laundry?dorm=shyr&area=%E5%AF%A6%E9%BD%8B%E5%A5%B3`.

## Library

`/<lang>/library?branch=<branch>&category=<category>` filters the library vacancy list.

| Parameter | Accepted values |
| --- | --- |
| `branch` | `all`, `main`, `moonlight`, `hss`, `ctm` |
| `category` | `all`, `moonlight`, `discussion`, `carrel`, `workstation`, `av`, `group` |

Example: `/en/library?branch=moonlight&category=carrel`.

## Shops

| URL | Accepted values | Example |
| --- | --- | --- |
| `/<lang>/shops?area=<area>` | Exact values from `apps/web/src/app/[lang]/(mods-pages)/shops/areas.json`: `小吃部`, `水木生活中心1樓`, `水木生活中心2樓`, `風雲1樓`, `風雲2樓`, `風雲3樓`, `風雲4樓`, `綜合教學大樓`, `行政大樓(旁)`, `第二活動中心一樓`, `旺宏館一樓`, `百齡堂`, `人社院`, `第二招待所一樓`, `綜四館一樓` | `/zh/shops?area=%E9%A2%A8%E9%9B%B21%E6%A8%93` |
| `/<lang>/shops?building=<prefix>` | A building-name prefix from those area names, such as `小吃部`, `水木生活中心`, `風雲`, `綜合教學大樓`, `行政大樓`, `第二活動中心`, `旺宏館`, `百齡堂`, `人社院`, `第二招待所`, or `綜四館` | `/zh/shops?building=%E9%A2%A8%E9%9B%B2` |

## Map

| URL | Parameter | Accepted values / source | Example |
| --- | --- | --- | --- |
| `/<lang>/map` | `building` | Building IDs in `https://nthumods.com/data/campus-buildings.json`; the checked-in source is `apps/web/public/data/campus-buildings.json`. | `/zh/map?building=delta` |
| `/<lang>/map` | `venue` | A normalized venue code, name, prefix, or alias from the corresponding building entry in the JSON above. | `/en/map?venue=Delta%20Hall` |
| `/<lang>/map` | `feature` | An exact building, water, or area feature ID from `apps/web/public/data/nthu-main-campus.json`. | `/zh/map?feature=osm-relation-3927538-0` |

The building manifest is generated from `CAMPUS_BUILDING_IDENTITIES`, sorted by `id`, and each entry includes a ready-to-use Chinese map URL.
