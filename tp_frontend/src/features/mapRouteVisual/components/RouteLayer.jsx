import { legsToGeoJSON } from "../utils/legsToGeoJSON";

export function addRouteLayer(map, routeData) {
  const legsGeoJSON = legsToGeoJSON(routeData);

  map.addSource("route-legs", {
    type: "geojson",
    data: legsGeoJSON,
  });

  map.addLayer({
    id: "route-legs-line",
    type: "line",
    source: "route-legs",

    layout: {
      "line-join": "round",
      "line-cap": "round",
    },

    paint: {
      "line-color": "#2563eb",
      "line-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        9,
        5,
      ],
      "line-opacity": 0.35,
    },
  });
}