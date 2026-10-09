import polyline from "@mapbox/polyline";

export function routeToGeoJSON(routeData) {
  const decodedCoordinates = polyline.decode(
    routeData.overviewPolyline
  );

  const coordinates = decodedCoordinates.map(
    ([lat, lng]) => [lng, lat]
  );

  return {
    type: "Feature",
    properties: {
      dayId: routeData.dayId,
    },
    geometry: {
      type: "LineString",
      coordinates: coordinates,
    },
  };
}