# Map Route Visualization

## Overview

`mapRouteVisual` is the Travel Planner frontend feature for displaying an itinerary on an interactive map. It converts backend-compatible encoded route data into MapLibre sources, layers, markers, interactions, and animation.

The current prototype renders a Paris itinerary from the Louvre to Palais Garnier and the Arc de Triomphe. It supports a raster 2D mode and a vector 3D mode while preserving the same travel data and controls.

## Features

- 2D OpenStreetMap raster basemap
- 3D OpenFreeMap Liberty vector basemap with building extrusion
- Google encoded polyline decoding and GeoJSON route legs
- Numbered POI markers and popups
- Route-leg hover highlighting and information popups
- Automatic route bounds fitting
- Distance-based route animation with a moving traveler
- Play, Pause, and Restart controls
- Safe 2D/3D style switching and resource cleanup
- Race-condition protection during rapid style switching

## Technology Stack

- **Frontend:** React 19 and Create React App
- **Map renderer:** MapLibre GL JS 5.24
- **2D basemap:** OpenStreetMap raster tiles
- **3D basemap:** OpenFreeMap Liberty vector style
- **3D buildings:** MapLibre `fill-extrusion`
- **Route geometry:** Google encoded polyline converted to GeoJSON
- **Polyline decoder:** `@mapbox/polyline`

The implementation does not use Leaflet or React-Leaflet.

## Directory Structure

```text
mapRouteVisual/
├── components/
│   ├── Buildings3D.js
│   ├── MapView.jsx
│   ├── PoiMarkers.jsx
│   ├── RouteAnimation.js
│   ├── RouteInteraction.js
│   └── RouteLayer.jsx
├── config/
│   ├── mapStyles.js
│   └── mapStyles.test.js
├── data/
│   └── mockRouteData.js
├── mock/
│   └── backend_api_mockup_md/
│       ├── Google api response.md
│       ├── Google api response refine.md
│       └── test.json
├── services/
│   └── routingService.js
├── styles/
│   └── mapRouteVisual.css
├── utils/
│   ├── extractPois.js
│   ├── fitRouteBounds.js
│   ├── legsToGeoJSON.js
│   └── routeToGeoJSON.js
├── index.js
└── README.md
```

## Route Data Format

The module currently reads `data/mockRouteData.js`, whose shape represents the expected backend response:

```js
{
  dayId: 1,
  totalDistanceMeters: 5546,
  totalDurationSeconds: 1564,
  overviewPolyline: "...",
  legs: [
    {
      fromPoiId: 101,
      fromPoiName: "Musée du Louvre",
      fromLocation: { lat: 48.8606, lng: 2.3376 },
      toPoiId: 102,
      toPoiName: "Palais Garnier",
      toLocation: { lat: 48.8719, lng: 2.3316 },
      distanceMeters: 1817,
      distanceText: "1.8 km",
      durationSeconds: 573,
      durationText: "10 mins",
      polyline: "..."
    }
  ]
}
```

- `overviewPolyline` contains the complete route geometry and is currently used to calculate map bounds.
- `legs[].polyline` contains individual route segments used for rendering, hover interactions, and animation.
- Leg endpoint locations produce the POI markers.
- An encoded polyline decodes to `[lat, lng]`; GeoJSON requires `[lng, lat]`.

## Data Flow

```text
backend response / mockRouteData
        │
        ├── overviewPolyline
        │       └── routeToGeoJSON()
        │               └── fitRouteBounds()
        │
        ├── legs[].polyline
        │       ├── legsToGeoJSON()
        │       │       └── route-legs source and layer
        │       └── RouteAnimation
        │               ├── animated route
        │               └── moving traveler
        │
        └── leg endpoints
                └── extractPois()
                        └── MapLibre markers and popups
```

## Backend Integration

The prototype currently imports `mockRouteData` directly inside `MapView.jsx`. The intended component boundary for backend integration is:

```jsx
<MapView routeData={routeData} />
```

To connect a real backend:

1. Fetch or receive a route object with the documented shape.
2. Change `MapView` to accept `routeData` as a prop instead of importing the mock.
3. Pass that object to the existing route, marker, interaction, animation, and bounds helpers.
4. When `routeData` changes, remove the existing travel resources before adding resources for the new route.

Keep encoded-polyline decoding in the utility layer. Do not hard-code route coordinates in presentation components.

## Run Locally

From `tp_frontend`:

```bash
npm install
npm start
```

`App.js` currently renders `MapView`. Both basemap modes require network access.

Run tests and create a production build with:

```bash
npm test -- --watchAll=false --runInBand
npm run build
```

## Architecture

### Map and Travel Resources

`MapView.jsx` owns the MapLibre map and coordinates the feature modules. `addTravelLayers()` creates:

1. The route source and layer
2. POI markers
3. Route interaction handlers
4. The animation controller

`removeTravelLayers()` reverses that setup by removing markers, unregistering interactions, destroying animation resources, and removing the route layer and source. Cleanup is safe to run more than once.

MapLibre markers are DOM overlays, so `map.setStyle()` does not remove them. They must be removed explicitly to prevent duplicates.

### Route Rendering and Interaction

`RouteLayer.jsx` uses `legsToGeoJSON()` to create a GeoJSON `FeatureCollection`. It registers:

- Source: `route-legs`
- Layer: `route-legs-line`

Each leg is a separate feature. `RouteInteraction.js` uses feature state to highlight the hovered leg and displays its origin, destination, distance, and duration. It returns a cleanup function that unregisters the original event-handler references and removes the popup.

### Route Animation

`RouteAnimation.js` combines the decoded leg coordinates and calculates cumulative geographic distance. This makes animation speed depend on route distance rather than the number of polyline points.

The controller exposes:

```js
{ play, pause, restart, destroy }
```

It manages the `animated-route` and `traveler` sources plus their corresponding layers. `destroy()` cancels the active animation frame and removes those resources safely.

### 2D and 3D Styles

`config/mapStyles.js` defines both styles:

- `raster2DStyle`: OSM raster tiles, pitch `0`, bearing `0`
- `vector3DStyle`: OpenFreeMap Liberty, pitch `60`, bearing `-20`

The 3D building helper inspects the loaded style for vector layers using the `building` source layer. Liberty currently provides:

```text
source: openmaptiles
source-layer: building
layer: building-3d
height: render_height
base: render_min_height
```

The existing Liberty extrusion is reused to avoid duplicate buildings. For a compatible vector style without an extrusion layer, `Buildings3D.js` can add one below the first text-label layer, using `render_height` or `height` with a fallback of 12 meters.

Building coverage and height accuracy depend on OpenStreetMap/OpenFreeMap data.

### Style-Switch Lifecycle

Switching modes follows this sequence:

```text
removeTravelLayers()
        ↓
map.setStyle(targetStyle)
        ↓
wait for style.load
        ↓
add3DBuildings()  // 3D only
        ↓
addTravelLayers()
        ↓
fitRouteBounds()
        ↓
apply pitch and bearing
```

`setStyle()` removes style-bound sources and layers. Travel resources are therefore restored only after the new style has loaded. Animation currently resets to the route start after a style switch.

### Race-Condition Protection

Every style request increments `styleRequestId`. A `style.load` callback restores resources only if:

- Its request ID is still current.
- Its requested mode is still selected.
- Its map instance is still mounted.

This prevents an obsolete callback from adding buildings, markers, layers, animation controllers, or event handlers during rapid 2D → 3D → 2D switching. Unmounting also invalidates pending requests before the map is removed.

## Current Limitations

- `MapView` still imports one mock itinerary instead of accepting backend data as a prop.
- Only one itinerary day is displayed.
- Style switching resets the route animation.
- `routingService.js` is not connected to a backend request.
- Building detail depends on OpenFreeMap data coverage.
- Public OSM raster tiles are intended for development and low-volume use; production usage must follow the OSM tile policy.
