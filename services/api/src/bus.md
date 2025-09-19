# Bus API Documentation

This API provides real-time access to NTHU (National Tsing Hua University) bus schedules by scraping data directly from the official university website. It supports both campus shuttle buses and inter-campus routes.

## Base URL

```
/bus
```

## Endpoints

### GET /

Get bus schedule information based on specified parameters.

#### Parameters

All parameters are optional:

| Parameter   | Type   | Values                             | Default   | Description                  |
| ----------- | ------ | ---------------------------------- | --------- | ---------------------------- |
| `bus_type`  | string | `red`, `green`, `route1`, `route2` | -         | Filter by specific bus route |
| `day`       | string | `weekday`, `weekend`, `current`    | `weekday` | Schedule type to return      |
| `direction` | string | `up`, `down`                       | `down`    | Bus direction                |

#### Direction Values

- `down`: Toward destination (TSMC Building for campus bus, Nanda Campus for inter-campus)
- `up`: Toward main campus/gate

#### Day Values

- `weekday`: Regular weekday schedule
- `weekend`: Weekend/holiday schedule
- `current`: Returns only schedules after the current time

#### Bus Type Values

- `red`: Campus Red Line (紅線) - via CHSS/CLS Building
- `green`: Campus Green Line (綠線) - via Yi Pavilion Parking Lot
- `route1`: Inter-campus Route 1 (路線一) - via TSMC Building/Baoshan Road
- `route2`: Inter-campus Route 2 (路線二) - via COE Building/South Gate

## Response Format

The API returns an array of bus schedule items:

```json
[
  {
    "time": "7:30",
    "type": "往南大校區 路線一",
    "dep": "北校門口",
    "dest": "南大校區",
    "note": "此為付費市區公車(83號公車直達兩校區)"
  },
  {
    "time": "7:40",
    "type": "往南大校區 路線一",
    "dep": "北校門口",
    "dest": "南大校區",
    "note": ""
  }
]
```

### Response Fields

| Field  | Type   | Description                                           |
| ------ | ------ | ----------------------------------------------------- |
| `time` | string | Departure time in HH:MM format                        |
| `type` | string | Bus route description with direction                  |
| `dep`  | string | Departure stop                                        |
| `dest` | string | Destination stop                                      |
| `note` | string | Additional notes (e.g., paid bus, special conditions) |

## Examples

### Get all available schedules (default)

```http
GET /bus
```

Returns all weekday schedules going toward destinations (both campus and inter-campus).

### Get campus red line schedules

```http
GET /bus?bus_type=red&day=weekday&direction=down
```

### Get inter-campus route1 schedules

```http
GET /bus?bus_type=route1&day=weekend&direction=up
```

### Get current remaining schedules for today

```http
GET /bus?day=current
```

### Get weekend schedules toward main campus

```http
GET /bus?day=weekend&direction=up
```

## Route Information

### Campus Shuttle Bus (Red & Green Lines)

**Red Line - Toward TSMC Building:**
北校門口 → 綜二館 → 楓林小徑(女舍) → 人社院/生科院 → 台積館

**Red Line - Toward Main Gate:**
台積館 → 教育學院大樓/南門停車場 → 奕園停車場 → 綜二館 → 北校門口

**Green Line - Toward TSMC Building:**
北校門口 → 綜二館 → 楓林小徑(女舍) → 奕園停車場 → 教育學院大樓/南門停車場 → 台積館

**Green Line - Toward Main Gate:**
台積館 → 人社院/生科院 → 綜二館 → 北校門口

### Inter-Campus Shuttle (Route 1 & Route 2)

**Route 1 - Toward Nanda Campus:**
北校門口 → 綜二館 → 人社院/生科館 → 台積館(經寶山路) → 南大校區校門口右側(食品路校牆邊)

**Route 1 - Toward Main Campus:**
南大校區校門口右側(食品路校牆邊) → 台積館(經寶山路) → 人社院/生科館 → 綜二館 → 北校門口

**Route 2 - Toward Nanda Campus:**
北校門口 → 綜二館 → 奕園停車場 → 教育學院大樓/南門停車場(經寶山路) → 南大校區校門口右側(食品路校牆邊)

**Route 2 - Toward Main Campus:**
南大校區校門口右側(食品路校牆邊) → 教育學院大樓/南門停車場(經寶山路) → 奕園停車場 → 綜二館 → 北校門口

## Stop Information

### Campus Bus Stops

- **校門/綜二**: Main gate area and General Building II
- **台積館**: TSMC Building (main destination within campus)
- **北校門口**: North Main Gate

### Inter-Campus Stops

- **北校門口**: North Main Gate (main campus)
- **南大校區**: Nanda Campus (satellite campus)

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error (failed to fetch data)

### Error Response Format

```json
{
  "error": "Error message description"
}
```

## Special Notes

- **Paid Service**: Some buses marked with "此為付費市區公車(83號公車直達兩校區)" are paid city buses
- **Friday Suspension**: Some schedules marked with "週五停駛" do not operate on Fridays
- **Weather Delays**: Peak hours may experience delays due to campus traffic or weather conditions
- **Holiday Schedule**: During holidays like Teacher's Day, inter-campus shuttles may be suspended

## Weekend Schedules

Inter-campus shuttles have limited weekend service:

- **From Nanda**: 8:30, 12:00, 14:00, 17:00
- **From Main Campus**: 9:00, 12:30, 14:30, 17:30

## Data Sources

This API scrapes data from two official NTHU websites:

1. **Campus Bus (Red/Green Lines)**:
   https://affairs.site.nthu.edu.tw/p/412-1165-20978.php?Lang=zh-tw

2. **Inter-Campus Shuttle (Route1/Route2)**:
   https://affairs.site.nthu.edu.tw/p/412-1165-20979.php?Lang=zh-tw

## Contact Information

- **University Contact**: Division of Physical Facilities, Ms. Yang (Ext. 31370)
- **Transportation Company**: Yuan Chin Transportation, Ms. Peng (03-5284285, 0930-930932)

## Implementation Details

- Data is parsed from embedded JavaScript variables in the HTML pages
- Uses the `linkedom` library for HTML parsing
- Supports real-time filtering by current time when `day=current`
- Combines data from both sources when no specific `bus_type` is specified
- Handles both Traditional Chinese route descriptions and English translations
