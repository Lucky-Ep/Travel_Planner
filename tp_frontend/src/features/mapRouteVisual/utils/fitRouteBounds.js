import { LngLatBounds } from "maplibre-gl";
import { routeToGeoJSON } from "./routeToGeoJSON";

export function fitRouteBounds(map, routeData) {
  const routeGeoJSON = routeToGeoJSON(routeData);
  const coordinates = routeGeoJSON.geometry.coordinates;

  if (!coordinates || coordinates.length === 0) {
    return;
  }

  const bounds = new LngLatBounds();

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate);
  });

  map.fitBounds(bounds, {
    padding: 80,
    duration: 0,
  });
}