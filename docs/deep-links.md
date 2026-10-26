<!-- GENERATED FILE: do not edit. Run `bun run gen:deep-links` in `apps/web`. -->
# NTHUMods deep links

Use `/zh/...`, `/en/...`, or `/zh-cn/...` as the language prefix. Query values must be URL-encoded. Unknown values are ignored silently. Repeated-parameter handling is route-specific; see each route.

This registry is a public contract used by external integrations, including the NTHU Student Association LINE bot. The machine-readable copy is served at `https://nthumods.com/data/deep-links.json`.

## `/bus`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `tab` | 校車分頁。 Campus bus tab. | `north_gate`, `tsmc`, `nanda`, `city` | `nanda` |
| `stop` | 校園站名；中文精確比對並去除前後空白，英文比對不分大小寫。重複站名會選擇尚未離站的第一個。 Campus stop name; Chinese matching trims whitespace and English matching ignores case. The first not-yet-passed duplicate is selected. | `北校門口`, `綜二`, `楓林小徑`, `奕園停車場`, `南門停車場`, `台積館`, `人社院/生科院`, `North Main Gate`, `General Building II`, `Maple Path`, `Yi Pavilion Parking Lot`, `South Gate Parking Lot`, `TSMC Building`, `CHSS/CLS Building`, `南大校區`, `Nanda Campus`, `台積館(經寶山路)`, `TSMC Building(Baoshan Rd.)`, `教育學院大樓/南門停車場(經寶山路)`, `COE Building/South Gate Parking Lot(Baoshan Rd.)` | `General Building II` |

Examples:

- `/zh/bus?tab=nanda`
- `/en/bus?tab=north_gate&stop=General%20Building%20II`

## `/bus/main/:line`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `stop:green` | 該校園路線的站名。 A stop name on the selected campus line. | `北校門口`, `綜二`, `楓林小徑`, `奕園停車場`, `南門停車場`, `台積館`, `人社院/生科院`, `North Main Gate`, `General Building II`, `Maple Path`, `Yi Pavilion Parking Lot`, `South Gate Parking Lot`, `TSMC Building`, `CHSS/CLS Building` | `綜二` |
| `stop:red` | 該校園路線的站名。 A stop name on the selected campus line. | `北校門口`, `綜二`, `楓林小徑`, `人社院/生科院`, `台積館`, `南門停車場`, `奕園停車場`, `North Main Gate`, `General Building II`, `Maple Path`, `CHSS/CLS Building`, `TSMC Building`, `South Gate Parking Lot`, `Yi Pavilion Parking Lot` | `綜二` |

Examples:

- `/zh/bus/main/green?stop=%E7%B6%9C%E4%BA%8C`

## `/bus/nanda/:line`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `stop:route1_up` | 該南大路線的站名。 A stop name on the selected Nanda line. | `北校門口`, `綜二`, `人社院/生科院`, `台積館(經寶山路)`, `南大校區`, `North Main Gate`, `General Building II`, `CHSS/CLS Building`, `TSMC Building(Baoshan Rd.)`, `Nanda Campus` | `TSMC Building(Baoshan Rd.)` |
| `stop:route1_down` | 該南大路線的站名。 A stop name on the selected Nanda line. | `南大校區`, `台積館(經寶山路)`, `人社院/生科院`, `綜二`, `北校門口`, `Nanda Campus`, `TSMC Building(Baoshan Rd.)`, `CHSS/CLS Building`, `General Building II`, `North Main Gate` | `TSMC Building(Baoshan Rd.)` |
| `stop:route2_up` | 該南大路線的站名。 A stop name on the selected Nanda line. | `北校門口`, `綜二`, `奕園停車場`, `教育學院大樓/南門停車場(經寶山路)`, `南大校區`, `North Main Gate`, `General Building II`, `Yi Pavilion Parking Lot`, `COE Building/South Gate Parking Lot(Baoshan Rd.)`, `Nanda Campus` | `北校門口` |
| `stop:route2_down` | 該南大路線的站名。 A stop name on the selected Nanda line. | `南大校區`, `教育學院大樓/南門停車場(經寶山路)`, `奕園停車場`, `綜二`, `北校門口`, `Nanda Campus`, `COE Building/South Gate Parking Lot(Baoshan Rd.)`, `Yi Pavilion Parking Lot`, `General Building II`, `North Main Gate` | `南大校區` |

Examples:

- `/en/bus/nanda/route1_up?stop=TSMC%20Building%28Baoshan%20Rd.%29`

## `/bus/city/:route`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `direction` | 該城市公車路線資料中的方向 ID。 Direction ID from the selected city-bus route data. | runtime data | `HSZ000801` |
| `stop` | 該城市公車方向資料中的站點 ID。 Stop ID from the selected city-bus direction data. | runtime data | `HSZ303582` |

Examples:

- `/zh/bus/city/83?direction=HSZ000801&stop=HSZ303582`

## `/laundry`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `dorm` | 宿舍 key 或 slug；會覆寫已儲存的宿舍。 Dorm key or slug; overrides the stored dorm. | `義齋`, `明齋`, `實齋`, `新齋`, `華齋`, `禮齋`, `誠齋`, `雅齋`, `慧齋`, `靜齋`, `碩齋`, `仁齋`, `清華會館`, `yi`, `ming`, `shyr`, `hsin`, `hua`, `li`, `cheng`, `ya`, `huei`, `jing`, `shuo`, `jen`, `tsinghua_hall` | `jen` |
| `area` | 洗衣區 key 或 slug；沒有 dorm 時會推導宿舍。 Laundry-area key or slug; implies its dorm when dorm is absent. | `義齋`, `明齋`, `實齋男`, `實齋女`, `新齋`, `華齋`, `禮齋`, `誠齋`, `雅齋`, `慧齋`, `靜齋`, `碩齋`, `仁齋男`, `仁齋女`, `清華會館 9F`, `清華會館 B1`, `yi`, `ming`, `shyr_m`, `shyr_f`, `hsin`, `hua`, `li`, `cheng`, `ya`, `huei`, `jing`, `shuo`, `jen_m`, `jen_f`, `tsinghua_hall_9f`, `tsinghua_hall_b1` | `jen_m` |

Examples:

- `/zh/laundry?dorm=jen&area=jen_m`

## `/library`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `branch` | 圖書館分館。 Library branch. | `all`, `moonlight`, `main`, `hss`, `ctm` | `moonlight` |
| `category` | 座位類別。 Seat category. | `all`, `moonlight`, `discussion`, `carrel`, `workstation`, `av`, `group` | `carrel` |

Examples:

- `/en/library?branch=moonlight&category=carrel`

## `/shops`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `area` | areas.json 中的完整區域名稱。 An exact area name from areas.json. | `小吃部`, `水木生活中心1樓`, `水木生活中心2樓`, `風雲1樓`, `風雲2樓`, `風雲3樓`, `風雲4樓`, `綜合教學大樓`, `行政大樓(旁)`, `第二活動中心一樓`, `旺宏館一樓`, `百齡堂`, `人社院`, `第二招待所一樓`, `綜四館一樓` | `風雲1樓` |
| `building` | areas.json 區域名稱的建築前綴；多個匹配時會保留篩選清單。 A building prefix from areas.json; multiple matches remain as a filter list. | `小吃部`, `水木生活中心`, `水木生活中心1樓`, `水木生活中心2樓`, `風雲`, `風雲1樓`, `風雲2樓`, `風雲3樓`, `風雲4樓`, `綜合教學大樓`, `行政大樓(旁)`, `第二活動中心一樓`, `旺宏館一樓`, `百齡堂`, `人社院`, `第二招待所一樓`, `綜四館一樓` | `風雲` |

Examples:

- `/zh/shops?area=%E9%A2%A8%E9%9B%B21%E6%A8%93`
- `/zh/shops?building=%E9%A2%A8%E9%9B%B2`

## `/map`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `building` | 校園建築 identity ID，來源為 campus-building manifest。 Campus building identity ID from the campus-building manifest. | `bmes`, `computer-center`, `chemical-engineering`, `chemistry`, `chemistry-ii`, `clinic-counseling`, `delta`, `dorm-ren`, `dorm-shi`, `education`, `eecs`, `engineering-i`, `ess`, `general-i`, `general-ii`, `general-iii`, `general-iv`, `hss`, `life-science-i`, `life-science-ii`, `green-energy`, `materials-science`, `materials-lab`, `mxic`, `nthu-lab`, `physics`, `physics-lab`, `student-union`, `tsmc` | `delta` |
| `venue` | 建築 code、名稱、prefix 或 alias；由同一組 building identities 驗證。 Building code, name, prefix, or alias validated by the same building identities. | `醫環`, `BMES`, `BMES醫環`, `生醫工程及環境科學館`, `Biomedical Engineering and Environmental Sciences Building`, `生醫工程與環境科學館`, `計中`, `CC`, `CC計中`, `第二綜合大樓(計通中心)`, `General Building II (Computer & Communication Center)`, `計通中心`, `化工`, `CHE`, `CHE化工`, `化工館`, `Chemical Engineering Building`, `化`, `CHEM`, `CHEM化`, `化學館`, `Chemistry Building`, `化二`, `CHEM II`, `CHEM II化二`, `動機化學實驗館(化學二館)`, `Chemistry and Power Mechanical Engineering Building`, `動機化學實驗室`, `化學二館`, `諮商`, `Counsel`, `Counsel諮商`, `醫輔中心`, `Clinic and Counseling Center`, `台達`, `DELTA`, `DELTA台達`, `台達館`, `Delta Building`, `Delta Hall`, `仁齋`, `D-Ren`, `D-Ren仁齋`, `Dormitory Ren`, `Dormitory Jen`, `實齋`, `D-Shi`, `D-Shi實齋`, `Dormitory Shi`, `Dormitory Shyr`, `教`, `EDU`, `EDU教`, `教育館`, `Education Building`, `資電`, `EECS`, `EECS資電`, `資訊電機館`, `Electrical Engineering and Computer Science Building`, `資電館`, `EECS Building`, `劉炯朗館`, `C.L. Liu Building`, `工一`, `ENG I`, `ENG I工一`, `工程一館`, `Engineering Building I`, `工科`, `ESS`, `ESS工科`, `工科館`, `Engineering and System Science Building`, `綜一`, `GEN I`, `GEN I綜一`, `第一綜合大樓`, `General Building I`, `第一綜合大樓: 行政大樓`, `綜二`, `GEN II`, `GEN II綜二`, `第二綜合大樓`, `General Building II`, `綜三`, `GEN III`, `GEN III綜三`, `第三綜合大樓`, `General Building III`, `綜四`, `GEN IV`, `GEN IV綜四`, `第四綜合大樓`, `General Building IV`, `人社`, `HSS`, `HSS人社`, `人文社會學院`, `Humanities and Social Sciences Building`, `生一`, `LS I`, `LS I生一`, `生命科學一館`, `Life Science Building I`, `生二`, `LS II`, `LS II生二`, `生命科學二館`, `Life Science Building II`, `綠能`, `LTM`, `LTM綠能`, `綠能大樓(李存敏館)`, `Lee Tsen Min Building`, `綠色低碳能源大樓`, `李存敏館`, `Green Energy Building`, `材料`, `MS`, `MS材料`, `材料科技館`, `Materials Science and Technology Building`, `材料科技館: 工程四館`, `材實`, `MSLAB`, `MSLAB材實`, `材料實驗館`, `Materials Science Laboratory`, `旺宏`, `MXIC`, `MXIC旺宏`, `旺宏館(學習資源中心)`, `MXIC Building(Learning Resource Center)`, `學習資源中心`, `Learning Resource Centre`, `Main Library`, `清實`, `NTHU Lab`, `NTHU Lab清實`, `清華實驗室`, `Tsing Hua Laboratory`, `物`, `PHYS`, `PHYS物`, `物理館`, `Physics Building`, `普實`, `PHYSLAB`, `PHYSLAB普實`, `普物實驗館`, `Physics Laboratory`, `蒙民`, `STC`, `STC蒙民`, `學生活動中心`, `Student Union`, `蒙民偉樓`, `台積`, `TSMC`, `TSMC台積`, `台積館`, `TSMC Building` | `Delta Hall` |
| `feature` | 下載的校園地圖 building、water 或 area feature ID；值會依目前地圖資料驗證。 A building, water, or area feature ID from the downloaded campus map data; validated against the current map data. | free-text (validated at runtime) | `osm-relation-3927538-0` |

Examples:

- `/zh/map?building=delta`
- `/en/map?venue=Delta%20Hall`

## `/youbike`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `tab` | YouBike 篩選分頁。 YouBike filter tab. | `all`, `main`, `nanda`, `mine` | `main` |
| `station` | YouBike 九位數站點 ID；站點必須存在於目前 API 資料。 Nine-digit YouBike station ID; the station must exist in the current API data. | runtime data | `500401008` |

Examples:

- `/zh/youbike?tab=main&station=500401008`

## `/sports-venues`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `facility` | 目前運動場館資料中的中文場館名稱。 A Chinese facility name from the current sports-venue data. | runtime data | `體育館` |

Examples:

- `/zh/sports-venues?facility=%E9%AB%94%E8%82%B2%E9%A4%A8`

## `/calendar`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `date` | 台北時區的有效日期，作為檢視錨點。 A valid Taipei-time date used as the view anchor. | pattern: `\d{4}-\d{2}-\d{2}` | `2026-10-24` |
| `view` | 行事曆檢視模式。 Calendar display mode. | `week`, `month`, `upcoming` | `month` |

Examples:

- `/zh/calendar?date=2026-10-24&view=month`

## `/announcements`

Duplicate parameters: `ignored`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `source` | 目前公告 API 資料中的 source ID。 A source ID from the current announcements API data. | runtime data | `source-academic` |

Examples:

- `/zh/announcements?source=source-academic`

## `/courses/changes`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `days` | 顯示最近幾天的課程變更。 The number of recent days of course changes to show. | `7`, `14`, `30` | `7` |
| `department` | 系所代碼，例如 CS。 A department code, such as CS. | `AES`, `AIA`, `AIIM`, `AMEV`, `ANTH`, `ANTU`, `ASTR`, `BAI`, `BME`, `BMES`, `CF`, `CHE`, `CHEM`, `CHSS`, `CL`, `CLC`, `CLU`, `COM`, `CS`, `CSR`, `CTM`, `DL`, `DMS`, `E`, `EC`, `ECON`, `EE`, `EECS`, `EMBA`, `EMD`, `EMIM`, `EMM`, `EMS`, `ENE`, `ESS`, `EST`, `ESTU`, `FL`, `FLU`, `FMMI`, `GE`, `GEC`, `GEU`, `GLLB`, `GOM`, `GPTS`, `HBA`, `HIS`, `HSS`, `HSSU`, `IACS`, `IACU`, `IBP`, `ICMS`, `IEEM`, `IEM`, `IIMT`, `IIS`, `IMBA`, `IMS`, `IPE`, `IPHD`, `IPMT`, `IPNS`, `IPT`, `IPTH`, `ISA`, `ISS`, `JAC`, `JAD`, `JADN`, `JANT`, `JITA`, `JMU`, `JMUN`, `KCSN`, `KEC`, `KECN`, `KEE`, `KEEN`, `KEL`, `KELN`, `KENI`, `KES`, `KHCT`, `KIPE`, `KLST`, `KMS`, `KMSN`, `KPC`, `KPCN`, `KPE`, `KSEN`, `KSN`, `KSPE`, `KSS`, `KSSN`, `KTLT`, `KWEN`, `LANG`, `LE`, `LING`, `LMIP`, `LS`, `LSBI`, `LSBS`, `LSBT`, `LSC`, `LSIN`, `LSMC`, `LSMM`, `LSSN`, `LST`, `MATH`, `MATU`, `MBA`, `MCLC`, `MFB`, `MI`, `MPM`, `MS`, `NEMS`, `NES`, `NUCL`, `PE`, `PE1`, `PE3`, `PFMI`, `PHIL`, `PHYS`, `PHYU`, `PME`, `PMED`, `QF`, `QTAM`, `RADM`, `RDDM`, `RDIC`, `RDPE`, `S`, `SCI`, `SL`, `SLS`, `SNHC`, `SOC`, `STAT`, `STAU`, `TE`, `TEE`, `TEG`, `THC`, `THSM`, `TIGP`, `TL`, `TM`, `TSE`, `TSED`, `UPPP`, `VA`, `VGE`, `VM`, `W`, `WH`, `WW`, `WZ`, `X`, `XA`, `XZ`, `YZ`, `ZY` | `CS` |

Examples:

- `/zh/courses/changes?days=7&department=CS`

## `/settings`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `#section` | 設定頁可定位的 section 或 setting hash。 A settings section or setting hash that the page can scroll to. | `appearance`, `display`, `calendar`, `timetable`, `ai`, `account`, `privacy`, `advanced`, `setting-dark-mode`, `setting-language`, `setting-compact-header`, `setting-academic-calendar`, `setting-experimental-calendar`, `setting-widget-dashboard`, `setting-default-view`, `setting-ai-department`, `setting-ai-entrance-year`, `setting-ai-api-key`, `setting-ai-api-key-value`, `setting-account`, `setting-sync-status`, `setting-restore-backup`, `setting-analytics`, `setting-custom-css` | `account` |

Examples:

- `/zh/settings#account`
- `/en/settings#setting-dark-mode`

## `/reviews/past`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `semester` | 將指定學期排在待評價課程清單前面。 Places the selected semester first in the past-course review list. | pattern: `\d{5}` | `11420` |

Examples:

- `/zh/reviews/past?semester=11420`

## `/courses/modules`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `q` | 模組搜尋文字。 Module search text. | free-text (validated at runtime) | `computer` |

Examples:

- `/en/courses/modules?q=computer`

## `/courses/module/:moduleKey`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `title` | 模組變體標題；不符合目前模組資料時使用預設變體。 Module variant title; an unknown title falls back to the default variant. | free-text (validated at runtime) | `Introduction to Computer Science` |

Examples:

- `/en/courses/module/CS%3A101?title=Introduction%20to%20Computer%20Science`

## `/timetable/view`

Duplicate parameters: `first-value`.

| Parameter | Description | Accepted values | Example |
| --- | --- | --- | --- |
| `semester_<semester>` | 課表分享或 CCXP 匯入的學期課程清單 key，例如 semester_11510。 A semester course-list key for timetable sharing or CCXP import, such as semester_11510. | pattern: `semester_\d{3}(?:10|20)` | `semester_11510=11510CS 535100` |
| `source` | 使用 CCXP 匯入模式時為 ccxp。 Use ccxp to select CCXP import mode. | `ccxp` | `ccxp` |

Examples:

- `/zh/timetable/view?semester_11510=11510CS%20535100&source=ccxp`

## Contract notes

- Deep-link values are validated by the same resolver data used by the page. Values from API or downloaded route data are intentionally shown as runtime data.
- Hash reads are outside the query-parameter coverage scan; the settings `#section` contract is registered by hand.
- `return_url` and other transport-only parameters are internal and are not part of this public registry.
