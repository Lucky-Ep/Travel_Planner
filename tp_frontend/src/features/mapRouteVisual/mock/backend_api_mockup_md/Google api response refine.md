# Map Route API Response Requirements

前端这边会使用 **MapLibre** 做地图和路线 visualization。

现在的 response 基本可以使用，但为了画 **POI markers** 和 **每一段 route**，希望在现有 JSON 基础上补充以下字段：

1. 每个 POI 的 `lat` / `lng`
2. 每个 `leg` 自己的 `polyline`

`overviewPolyline` 继续保留，用来画整条路线。

这样前端可以直接：

**Backend JSON → Decode Polyline → GeoJSON → MapLibre**

不需要在前端重新请求 Routing API。

## Expected JSON Response

```json
{
  "dayId": 1,
  "totalDistanceMeters": 5600,
  "totalDurationSeconds": 1380,

  "overviewPolyline": "yhhkEj~jM~@nB_@pCi@|Dk@nEw@vFo@zGy@hI...",

  "legs": [
    {
      "fromPoiId": 101,
      "fromPoiName": "Musée du Louvre (卢浮宫)",
      "fromLocation": {
        "lat": 48.8606,
        "lng": 2.3376
      },

      "toPoiId": 102,
      "toPoiName": "Palais Garnier (巴黎歌剧院)",
      "toLocation": {
        "lat": 48.8719,
        "lng": 2.3316
      },

      "distanceMeters": 2100,
      "distanceText": "2.1 km",
      "durationSeconds": 540,
      "durationText": "9 mins",

      "polyline": "encoded_polyline_for_this_leg"
    },
    {
      "fromPoiId": 102,
      "fromPoiName": "Palais Garnier (巴黎歌剧院)",
      "fromLocation": {
        "lat": 48.8719,
        "lng": 2.3316
      },

      "toPoiId": 103,
      "toPoiName": "Arc de Triomphe (凯旋门)",
      "toLocation": {
        "lat": 48.8738,
        "lng": 2.2950
      },

      "distanceMeters": 3500,
      "distanceText": "3.5 km",
      "durationSeconds": 840,
      "durationText": "14 mins",

      "polyline": "encoded_polyline_for_this_leg"
    }
  ]
}
```

## Frontend Usage

- `fromLocation` / `toLocation`
  - 用于在 MapLibre 上绘制 POI markers。

- `legs[].polyline`
  - 用于单独绘制和控制每一段 route。
  - 例如 hover / highlight 某一个 leg。

- `overviewPolyline`
  - 用于绘制当天完整路线。

前端会负责将 encoded polyline decode，并转换成 **GeoJSON `LineString`** 后交给 MapLibre 渲染。